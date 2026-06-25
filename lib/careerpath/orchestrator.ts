import { zodResponseFormat } from "openai/helpers/zod";
import { openai, ProfileSchema, GapReportSchema, ResumeContentSchema, ResumeAuditSchema, TailoringResultSchema } from "./llm";
import type { CareerPathProfile, BuilderMode, GapReport, CareerPathResumeContent, CareerPathResumeAudit, CareerPathTailoringResult } from "./types";

export async function extractProfileDataAgent(input: string, existing: CareerPathProfile, targetRole: string): Promise<CareerPathProfile> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert resume parser. Extract profile data from the user's messy notes. Merge it intelligently with their existing profile JSON. Ensure arrays have unique items. If they provide a new name/email/link, update it. For target role, infer industry. For skills, categorize into programming, frameworks, tools, databases, aiTools, softSkills." },
      { role: "user", content: `Existing Profile: ${JSON.stringify(existing)}\n\nNew Input: ${input}\n\nTarget Role (if any): ${targetRole}` }
    ],
    response_format: zodResponseFormat(ProfileSchema, "profile"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) return existing;
  const result = JSON.parse(content);
  
  return {
    ...existing,
    ...result,
    id: existing.id,
    userId: existing.userId,
    target: { ...existing.target, ...result.target },
    rawNotes: [existing.rawNotes, input].filter(Boolean).join("\n\n")
  } as CareerPathProfile;
}

export async function detectGapsAgent(profile: CareerPathProfile, mode: BuilderMode): Promise<GapReport> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `You are an expert resume consultant. Analyze the profile for missing critical information. A useful resume needs a target role and at least one education, project, or experience. Return readyToGenerate=true if we have enough to generate a draft. Return questions to ask if critical details are missing.` },
      { role: "user", content: `Mode: ${mode}\nProfile: ${JSON.stringify(profile)}` }
    ],
    response_format: zodResponseFormat(GapReportSchema, "gapReport"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to parse GapReport");
  return JSON.parse(content) as GapReport;
}

export async function writeResumeAgent(profile: CareerPathProfile, mode: BuilderMode, jobDescription = ""): Promise<CareerPathResumeContent> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert resume writer. Write a professional, ATS-friendly resume using ONLY the provided profile data. Do NOT hallucinate skills, metrics, or experience. Group skills logically. Write strong action-oriented bullets for projects and experience." },
      { role: "user", content: `Profile: ${JSON.stringify(profile)}\nJob Description (if any): ${jobDescription}` }
    ],
    response_format: zodResponseFormat(ResumeContentSchema, "resume"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to write resume");
  return JSON.parse(content) as CareerPathResumeContent;
}

export async function auditResumeAgent(contentParam: CareerPathResumeContent, targetRole: string, jobDescription = ""): Promise<CareerPathResumeAudit> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a strict resume auditor. Score the resume across various metrics out of 100. Identify missing contact info, weak bullets, unsupported metrics, or poor alignment with the target role." },
      { role: "user", content: `Resume: ${JSON.stringify(contentParam)}\nTarget Role: ${targetRole}\nJob Description: ${jobDescription}` }
    ],
    response_format: zodResponseFormat(ResumeAuditSchema, "audit"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to audit resume");
  return JSON.parse(content) as CareerPathResumeAudit;
}

export async function improveResumeAgent(contentParam: CareerPathResumeContent, audit: CareerPathResumeAudit, targetRole: string): Promise<CareerPathResumeContent> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert resume editor. Improve the provided resume based on the audit feedback. Tighten the summary, professionalize bullets, but NEVER hallucinate or invent new metrics/facts." },
      { role: "user", content: `Resume: ${JSON.stringify(contentParam)}\nAudit: ${JSON.stringify(audit)}\nTarget Role: ${targetRole}` }
    ],
    response_format: zodResponseFormat(ResumeContentSchema, "resume"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to improve resume");
  return JSON.parse(content) as CareerPathResumeContent;
}

export async function tailorResumeAgent(resumeContent: CareerPathResumeContent, targetRole: string, jobDescription: string): Promise<CareerPathTailoringResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert resume tailor. Adjust the summary and bullet points to match the provided job description using ONLY skills the candidate already possesses. Do NOT invent new skills." },
      { role: "user", content: `Resume: ${JSON.stringify(resumeContent)}\nJob Description: ${jobDescription}\nTarget Role: ${targetRole}` }
    ],
    response_format: zodResponseFormat(TailoringResultSchema, "tailoring"),
  });
  
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to tailor resume");
  return JSON.parse(content) as CareerPathTailoringResult;
}

export function inferIntentAgent(message: string): { intent: BuilderMode; targetRole: string; confidence: number; nextAction: string } {
  const text = message.toLowerCase();
  const intent: BuilderMode = text.includes("tailor") || text.includes("job description")
    ? "tailor"
    : text.includes("improve") || text.includes("existing resume")
      ? "improve"
      : "build";
  return {
    intent,
    targetRole: "", 
    confidence: text.length > 10 ? 0.86 : 0.62,
    nextAction: intent === "tailor" ? "collect_resume_and_job" : "collect_profile_data",
  };
}
