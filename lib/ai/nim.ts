import OpenAI from "openai";
import type {
  JobAnalysis,
  ProofScoreSubmission,
  ResumeContent,
  ResumeWarning,
  UserVault,
} from "../types";
import { calculateProofScore, submissionToVault } from "../proof-score";
import { analyzeJobFit } from "@/lib/agents/job-fit-agent";
import { auditProof } from "@/lib/agents/proof-auditor-agent";
import { generateResumeWithAgent, sanitizeResumeResult } from "@/lib/agents/resume-agent";

const SYSTEM_PROMPT = `You are CareerProof AI, an honest career assistant for Indian students and freshers. Your job is to improve the presentation of real achievements, not invent credentials. Only use the user's provided profile, education, skills, projects, proof links, certificates, experience, achievements, and job description. If a claim is unsupported, flag it. If the user lacks proof, suggest what proof to add. Never fabricate internships, companies, numbers, awards, certificates, technologies, or results. Generate ATS-friendly, recruiter-readable content. Prioritize specificity, proof, and honesty over hype. Output strict JSON.`;

const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";

function getNimClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
}

function parseJsonObject<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return fallback;
    }
  }
}

export function fallbackJobAnalysis(userVault: UserVault, jobDescription: string): JobAnalysis {
  const proofAudit = auditProof(userVault);
  return analyzeJobFit(userVault, jobDescription, proofAudit);
}

export function fallbackResume(userVault: UserVault, jobAnalysis?: JobAnalysis, style = "ATS Formal") {
  const proofAudit = auditProof(userVault);
  return generateResumeWithAgent(userVault, jobAnalysis, proofAudit, style);
}

export async function analyzeJobDescription(userVault: UserVault, jobDescription: string): Promise<JobAnalysis> {
  const fallback = fallbackJobAnalysis(userVault, jobDescription);
  const ai = getNimClient();
  if (!ai) return fallback;

  const prompt = `Analyze this job description against the user's career vault.

Job Description:
${jobDescription}

User Vault:
${JSON.stringify(userVault)}

Return JSON only:
{
  "targetTitle": "",
  "targetCompany": "",
  "requiredSkills": [],
  "preferredSkills": [],
  "missingSkills": [],
  "matchingSkills": [],
  "recommendedProjects": [],
  "fitScore": 0,
  "resumeAngle": "",
  "warnings": []
}`;

  try {
    const response = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });
    return parseJsonObject(response.choices[0].message.content || undefined, fallback);
  } catch {
    return fallback;
  }
}

export async function generateTailoredResume(
  userVault: UserVault,
  jobAnalysis: JobAnalysis,
  style: string,
): Promise<{ content: ResumeContent; warnings: ResumeWarning[] }> {
  const fallback = fallbackResume(userVault, jobAnalysis, style);
  const ai = getNimClient();
  if (!ai) return fallback;

  const prompt = `Generate a tailored resume based only on the provided vault and job analysis.

CRITICAL INSTRUCTIONS:
- Never include placeholder text like "Project added during onboarding" or "Add details in Career Vault" in generated resumes.
- Never include internal guidance text inside the final resume.
- Use real user profile data exactly as provided. Do not use generic fallback emails.
- Clean project titles to ensure they look professional (e.g., capitalize, fix spacing).
- Generate a professional ATS-friendly summary (do not just say "I build things").
- If data is weak, use honest but polished wording (e.g., "Engineered MVP", "Developed core functionality").

Resume bullet style: action verb + what was built/done + technology/method + outcome/proof.
Style: ${style}
Job Analysis: ${JSON.stringify(jobAnalysis)}
Vault: ${JSON.stringify(userVault)}

Return JSON only:
{
  "content": {
    "header": { "name": "", "email": "", "phone": "", "city": "", "links": [] },
    "summary": "",
    "skills": { "technical": [], "tools": [], "soft": [] },
    "projects": [],
    "experience": [],
    "education": [],
    "certifications": [],
    "achievements": []
  },
  "warnings": []
}`;

  try {
    const response = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });
    const parsed = parseJsonObject<{ content?: ResumeContent; warnings?: ResumeWarning[] }>(
      response.choices[0].message.content || undefined,
      fallback,
    );
    return sanitizeResumeResult(
      { content: parsed.content ?? fallback.content, warnings: parsed.warnings ?? fallback.warnings },
      userVault,
      jobAnalysis,
      auditProof(userVault),
    );
  } catch {
    return fallback;
  }
}

export async function generateCoverLetter(userVault: UserVault, jobDescription: string, resume?: ResumeContent) {
  const project = userVault.projects[0];
  const fallback = {
    content: `Dear Hiring Team,\n\nI am applying for this role with a proof-backed profile built around real projects and verifiable work. My strongest match is ${project?.title || "my project work"}, where I ${project?.short_description || "built and documented practical work"}${project?.tech_stack.length ? ` using ${project.tech_stack.slice(0, 4).join(", ")}` : ""}.\n\nI have not added unsupported claims. Where my profile has gaps against the job description, I am ready to discuss what I have learned and what proof I can share.\n\nRegards,\n${userVault.profile.full_name}`,
    warnings: jobDescription.length < 120 ? ["The job description is short, so the letter is intentionally general."] : [],
    resumeUsed: Boolean(resume),
  };
  const ai = getNimClient();
  if (!ai) return fallback;

  try {
    const response = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Write a concise proof-backed cover letter as JSON {"content":"","warnings":[]} using only this vault, resume and JD. Vault: ${JSON.stringify(userVault)} Resume: ${JSON.stringify(resume ?? {})} JD: ${jobDescription}` }
      ],
      response_format: { type: "json_object" },
    });
    return parseJsonObject(response.choices[0].message.content || undefined, fallback);
  } catch {
    return fallback;
  }
}

export async function generateLinkedInAbout(userVault: UserVault) {
  const profile = userVault.profile;
  const topProjects = userVault.projects.slice(0, 2).map((project) => project.title).join(" and ");
  const fallback = {
    content: `${profile.full_name} is an early-career ${profile.target_roles[0] || "professional"} building a proof-backed career profile. Their work includes ${topProjects || "documented projects"} with links to code, demos, certificates, or case studies where available. They focus on honest, recruiter-readable evidence instead of inflated claims.`,
    warnings: userVault.projects.length === 0 ? ["Add projects before publishing this LinkedIn About section."] : [],
  };
  const ai = getNimClient();
  if (!ai) return fallback;

  try {
    const response = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Generate a LinkedIn About section as JSON {"content":"","warnings":[]} using only this vault: ${JSON.stringify(userVault)}` }
      ],
      response_format: { type: "json_object" },
    });
    return parseJsonObject(response.choices[0].message.content || undefined, fallback);
  } catch {
    return fallback;
  }
}

export async function generatePortfolioSummary(userVault: UserVault) {
  const score = calculateProofScore(userVault);
  return {
    whyHire:
      score.total >= 65
        ? `${userVault.profile.full_name} has a proof-backed profile with visible projects, links, and a ${score.grade.toLowerCase()} trust score.`
        : `${userVault.profile.full_name} is building a transparent fresher profile. Review the linked work and proof gaps before making a decision.`,
    proofScore: score,
  };
}

export async function improveProjectBullet(project: UserVault["projects"][number], targetRole: string) {
  const fallback = {
    bullet: `Built ${project.short_description || project.title}${project.tech_stack.length ? ` using ${project.tech_stack.slice(0, 4).join(", ")}` : ""} for ${targetRole || project.target_users || "target users"}, with proof available through the attached project links.`,
    missingProof: !project.github_url && !project.live_url && !project.case_study_url ? ["Add GitHub, live demo, screenshots, or case study link."] : [],
  };
  const ai = getNimClient();
  if (!ai) return fallback;

  try {
    const response = await ai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Improve this project bullet as JSON {"bullet":"","missingProof":[]} without inventing facts. Project: ${JSON.stringify(project)} Target role: ${targetRole}` }
      ],
      response_format: { type: "json_object" },
    });
    return parseJsonObject(response.choices[0].message.content || undefined, fallback);
  } catch {
    return fallback;
  }
}

export async function analyzeProofScoreSubmission(submission: ProofScoreSubmission) {
  const vault = submissionToVault(submission);
  return calculateProofScore(vault);
}
