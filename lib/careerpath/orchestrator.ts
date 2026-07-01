import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  getAiClient,
  getModel,
  ProfileSchema,
  GapReportSchema,
  ResumeContentSchema,
  ResumeAuditSchema,
  TailoringResultSchema,
  StarInterviewSchema,
  HumanizedResumeSchema,
  ImpactEstimateSchema,
  GapAnalysisSchema,
  MultiPersonaSchema,
  ATSParseSchema,
  OutreachPackSchema,
} from "./llm";
import { detectGaps } from "./agents";
import { saveAgentRun } from "./db";
import type {
  CareerPathProfile,
  CareerProfile,
  BuilderMode,
  GapReport,
  CareerPathResumeContent,
  CareerPathResumeAudit,
  CareerPathTailoringResult,
  StarInterviewResult,
  HumanizedResume,
  ImpactEstimateResult,
  GapAnalysisResult,
  MultiPersonaResult,
  ATSParseResult,
  OutreachPack,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callWithValidation<T>(
  agentName: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: any; error?: unknown } },
  messages: { role: "system" | "user"; content: string }[],
  formatName: string,
  zodSchema: Parameters<typeof zodResponseFormat>[0],
  fallbackFn?: () => T,
  metadata?: {
    sessionId?: string;
    resumeId?: string;
    userId?: string;
    inputJson?: unknown;
    fast?: boolean;
  }
): Promise<T> {
  const startMs = Date.now();
  const model = getModel(metadata?.fast);
  let lastError: string | undefined;
  
  const inputJson = metadata?.inputJson ?? messages;
  const provider = process.env.AI_PROVIDER || "nvidia";

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const openai = getAiClient();
      
      let messagesToSend = attempt === 0
        ? messages
        : [
            ...messages,
            {
              role: "user" as const,
              content: "The previous output was malformed. Please return ONLY a valid JSON data object.",
            },
          ];

      const reqPayload: any = {
        model,
        messages: messagesToSend,
        response_format: zodResponseFormat(zodSchema as any, formatName),
      };

      let options: any = { signal: controller.signal };

      const completion = await openai.chat.completions.create(reqPayload, options);

      clearTimeout(timeout);
      const content = completion.choices[0].message.content;
      if (!content) throw new Error(`Empty response from ${agentName}`);

      console.log(`\n\n--- RAW OUTPUT (${agentName}) ---\n`, content, `\n--- END RAW OUTPUT ---\n\n`);

      // Strip markdown code blocks and extract JSON
      let cleanContent = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      const firstBrace = cleanContent.indexOf('{');
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanContent);
      } catch (initialErr) {
        if (firstBrace !== -1) {
          let braces = 0;
          let inString = false;
          let escape = false;
          let endIndex = -1;
          for (let i = firstBrace; i < cleanContent.length; i++) {
            const char = cleanContent[i];
            if (escape) {
              escape = false;
              continue;
            }
            if (char === '\\') {
              escape = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') braces++;
              else if (char === '}') braces--;
              if (braces === 0) {
                endIndex = i;
                break;
              }
            }
          }
          if (endIndex !== -1) {
            cleanContent = cleanContent.slice(firstBrace, endIndex + 1);
            parsed = JSON.parse(cleanContent);
          } else {
            throw initialErr;
          }
        } else {
          throw initialErr;
        }
      }
      const result = schema.safeParse(parsed);

      if (result.success) {
        const latencyMs = Date.now() - startMs;
        await saveAgentRun({
          agentName,
          status: "completed",
          latencyMs,
          model,
          sessionId: metadata?.sessionId,
          resumeId: metadata?.resumeId,
          userId: metadata?.userId,
          inputJson,
          outputJson: parsed,
        }).catch(() => {}); // fire-and-forget
        return result.data as T;
      }

      lastError = `Validation failed on attempt ${attempt + 1}: ${JSON.stringify(result.error)}`;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  // Log failure
  await saveAgentRun({
    agentName,
    status: "failed",
    error: lastError,
    latencyMs: Date.now() - startMs,
    model,
    sessionId: metadata?.sessionId,
    resumeId: metadata?.resumeId,
    userId: metadata?.userId,
    inputJson,
  }).catch(() => {});

  if (fallbackFn) return fallbackFn();
  throw new Error(`${agentName} failed after 2 attempts: ${lastError}`);
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function extractProfileDataAgent(
  input: string,
  existing: CareerPathProfile,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<CareerPathProfile> {
  type ParsedProfile = z.infer<typeof ProfileSchema>;
  const result = await callWithValidation<ParsedProfile>(
    "ProfileExtractionAgent",
    ProfileSchema,
    [
      {
        role: "system",
        content:
          "You are an expert resume parser. Extract profile data from the user's messy notes. Merge it intelligently with their existing profile JSON. Ensure arrays have unique items. If they provide a new name/email/link, update it. For target role, infer industry. For skills, categorize into programming, frameworks, tools, databases, aiTools, softSkills. Do NOT invent data. Leave uncertain fields empty.",
      },
      {
        role: "user",
        content: `Existing Profile: ${JSON.stringify(existing)}\n\nNew Input: ${input}\n\nTarget Role (if any): ${targetRole}`,
      },
    ],
    "profile",
    ProfileSchema,
    () => existing as unknown as ParsedProfile, // fallback
    { ...metadata, fast: true, inputJson: { input, targetRole } }
  );

  return {
    ...existing,
    ...result,
    id: existing.id,
    userId: existing.userId,
    target: { ...existing.target, ...result.target },
    rawNotes: [existing.rawNotes, input].filter(Boolean).join("\n\n"),
  } as CareerPathProfile;
}

export async function detectGapsAgent(
  profile: CareerPathProfile,
  mode: BuilderMode,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<GapReport> {
  return callWithValidation<GapReport>(
    "GapDetectionAgent",
    GapReportSchema,
    [
      {
        role: "system",
        content:
          "You are an expert resume consultant. Analyze the profile for missing critical information. A useful resume needs a target role and at least one education, project, or experience. Return readyToGenerate=true if we have enough to generate a draft. Ask maximum 3-5 questions. Only ask high-impact questions. Allow user to skip. If enough information exists, generate resume. Do not get stuck in endless questioning.",
      },
      {
        role: "user",
        content: `Mode: ${mode}\nProfile: ${JSON.stringify(profile)}`,
      },
    ],
    "gapReport",
    GapReportSchema,
    () => detectGaps(profile, mode),
    { ...metadata, fast: true, inputJson: { profile, mode } }
  );
}

export async function writeResumeAgent(
  profile: CareerPathProfile,
  mode: BuilderMode,
  jobDescription = "",
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<CareerPathResumeContent> {
  return callWithValidation<CareerPathResumeContent>(
    "ResumeWriterAgent",
    ResumeContentSchema,
    [
      {
        role: "system",
        content:
          "You are an expert resume writer. Write a professional, ATS-friendly resume using ONLY the provided profile data. Do NOT hallucinate skills, metrics, or experience. Do NOT fabricate company names, internships, certifications, revenue growth, user counts, or performance percentages. Group skills logically. Write strong action-oriented bullets for projects and experience. One-page length. For students/freshers, prioritize projects over experience. Use role-relevant keywords only when supported by profile.",
      },
      {
        role: "user",
        content: `Profile: ${JSON.stringify(profile)}\nJob Description (if any): ${jobDescription}`,
      },
    ],
    "resume",
    ResumeContentSchema,
    undefined,
    { ...metadata, fast: true, inputJson: { profile, mode, jobDescription } }
  );
}

export async function auditResumeAgent(
  contentParam: CareerPathResumeContent,
  targetRole: string,
  jobDescription = "",
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<CareerPathResumeAudit> {
  return callWithValidation<CareerPathResumeAudit>(
    "ATSAuditAgent",
    ResumeAuditSchema,
    [
      {
        role: "system",
        content:
          "You are a strict resume auditor. Score the resume across various metrics out of 100. Identify missing contact info, weak bullets, unsupported metrics, or poor alignment with the target role. Be honest about the score. This score is guidance, not a guarantee of selection.",
      },
      {
        role: "user",
        content: `Resume: ${JSON.stringify(contentParam)}\nTarget Role: ${targetRole}\nJob Description: ${jobDescription}`,
      },
    ],
    "audit",
    ResumeAuditSchema,
    undefined,
    { ...metadata, fast: true, inputJson: { content: contentParam, targetRole, jobDescription } }
  );
}

export async function improveResumeAgent(
  contentParam: CareerPathResumeContent,
  audit: CareerPathResumeAudit,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<CareerPathResumeContent> {
  return callWithValidation<CareerPathResumeContent>(
    "ResumeImprovementAgent",
    ResumeContentSchema,
    [
      {
        role: "system",
        content:
          "You are an expert resume editor. Improve the provided resume based on the audit feedback. Tighten the summary, professionalize bullets, fix grammar and repetition, improve role alignment and ATS formatting. NEVER hallucinate or invent new metrics, fake jobs, fake skills, fake education, fake certifications, or fake companies. Keep all existing sections.",
      },
      {
        role: "user",
        content: `Resume: ${JSON.stringify(contentParam)}\nAudit: ${JSON.stringify(audit)}\nTarget Role: ${targetRole}`,
      },
    ],
    "resume",
    ResumeContentSchema,
    undefined,
    { ...metadata, inputJson: { content: contentParam, audit, targetRole } }
  );
}

export async function tailorResumeAgent(
  resumeContent: CareerPathResumeContent,
  targetRole: string,
  jobDescription: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string; }
): Promise<CareerPathTailoringResult> {
  return callWithValidation<CareerPathTailoringResult>(
    "JobTailoringAgent",
    TailoringResultSchema,
    [
      {
        role: "system",
        content:
          "You are an expert resume tailor. Adjust the summary and bullet points to match the provided job description using ONLY skills the candidate already possesses. Do NOT invent new skills. Do not keyword-stuff. Rewrite summary. Reorder skills. Rewrite project bullets around relevant evidence. Show missing skills that were not added.",
      },
      {
        role: "user",
        content: `Resume: ${JSON.stringify(resumeContent)}\nJob Description: ${jobDescription}\nTarget Role: ${targetRole}`,
      },
    ],
    "tailoring",
    TailoringResultSchema,
    undefined,
    { ...metadata, fast: true, inputJson: { content: resumeContent, targetRole, jobDescription } }
  );
}

export function inferIntentAgent(message: string): {
  intent: BuilderMode;
  targetRole: string;
  confidence: number;
  nextAction: string;
} {
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

// ---------------------------------------------------------------------------
// LLM-based Intent Inference for Chat-first Agent
// ---------------------------------------------------------------------------

const IntentSchema = z.object({
  intent: z.enum([
    "CREATE_RESUME",
    "IMPROVE_RESUME",
    "TAILOR_TO_JOB",
    "ADD_INFORMATION",
    "REWRITE_SECTION",
    "ASK_MISSING_INFO",
    "GENERATE_PDF",
    "GENERAL_HELP",
  ]),
  confidence: z.number(),
  reasoning: z.string(),
});

/**
 * Infer user intent using LLM. Falls back to keyword matching on failure.
 */
export async function inferIntentLLM(
  message: string,
  hasExistingResume: boolean,
  metadata?: { userId?: string; resumeId?: string }
): Promise<{ intent: import("./types").AgentIntent; confidence: number }> {
  try {
    const result = await callWithValidation<z.infer<typeof IntentSchema>>(
      "IntentInferenceAgent",
      IntentSchema,
      [
        {
          role: "system",
          content: `You classify user messages into resume agent intents. The user is chatting with an AI resume agent.

Available intents:
- CREATE_RESUME: User wants to build a new resume from scratch, providing career details, or says "build my resume"
- IMPROVE_RESUME: User wants to improve/strengthen an existing resume, make it ATS friendly, or says "improve this"
- TAILOR_TO_JOB: User is pasting a job description or wants to tailor their resume to a specific job
- ADD_INFORMATION: User wants to add a project, certificate, skill, experience, or other info to existing resume
- REWRITE_SECTION: User wants to rewrite a specific section like summary, skills, project bullets
- ASK_MISSING_INFO: Not usually from user — skip this
- GENERATE_PDF: User wants to download, export, or print their resume as PDF
- GENERAL_HELP: User is asking what they can do, greeting, or off-topic

Context: User ${hasExistingResume ? "HAS" : "does NOT have"} an existing resume in the workspace.

If the user provides a lot of career details (education, skills, projects) without explicit instruction, classify as CREATE_RESUME.
If the message contains a job description or mentions "tailor" or "match this JD", classify as TAILOR_TO_JOB.
If the user mentions adding a specific thing (project, cert, skill), classify as ADD_INFORMATION.
If the user says rewrite/change a specific section, classify as REWRITE_SECTION.`,
        },
        {
          role: "user",
          content: message.slice(0, 2000),
        },
      ],
      "intentClassification",
      IntentSchema,
      undefined,
      { ...metadata, inputJson: { message: message.slice(0, 500) } }
    );

    return { intent: result.intent, confidence: result.confidence };
  } catch {
    // Fallback to keyword-based inference
    return inferIntentKeyword(message, hasExistingResume);
  }
}

export function inferIntentKeyword(
  message: string,
  hasExistingResume: boolean
): { intent: import("./types").AgentIntent; confidence: number } {
  const text = message.toLowerCase();

  // If the message is long (e.g. pasting career details or job description),
  // prioritize building/improving/tailoring over simple commands like download/print
  if (text.length > 500) {
    if (/\b(tailor|job description|match this jd|jd:)\b/.test(text) || /\b(responsibilities|qualifications|requirements|we are looking)\b/.test(text)) {
      return { intent: "TAILOR_TO_JOB", confidence: 0.85 };
    }
    return { intent: hasExistingResume ? "IMPROVE_RESUME" : "CREATE_RESUME", confidence: 0.7 };
  }

  if (/\b(download|export|print|pdf|save as)\b/.test(text)) {
    return { intent: "GENERATE_PDF", confidence: 0.9 };
  }
  if (/\b(tailor|job description|match this jd|jd:)\b/.test(text) || (text.length > 300 && /\b(responsibilities|qualifications|requirements|we are looking)\b/.test(text))) {
    return { intent: "TAILOR_TO_JOB", confidence: 0.85 };
  }
  if (/\b(add this project|add project|add certificate|add cert|add skill|add experience|add my github|add my linkedin)\b/.test(text)) {
    return { intent: "ADD_INFORMATION", confidence: 0.85 };
  }
  if (/\b(rewrite|change|modify|update)\b/.test(text) && /\b(summary|section|skills|bullets|project|experience|header)\b/.test(text)) {
    return { intent: "REWRITE_SECTION", confidence: 0.8 };
  }
  if (/\b(improve|stronger|better|ats friendly|make it ats|polish|enhance)\b/.test(text)) {
    return { intent: "IMPROVE_RESUME", confidence: 0.8 };
  }
  // Differentiation feature keywords
  if (/\b(interview me|ask me questions|what should i say|star questions|tell me about yourself)\b/.test(text)) {
    return { intent: "STAR_INTERVIEW", confidence: 0.9 };
  }
  if (/\b(humanize|sounds like ai|remove ai|de-ai|natural language|ai speak|sounds robotic|too generic)\b/.test(text)) {
    return { intent: "HUMANIZE_RESUME", confidence: 0.9 };
  }
  if (/\b(add metrics|estimate impact|put numbers|quantify|add numbers|impact estimate)\b/.test(text)) {
    return { intent: "ESTIMATE_IMPACT", confidence: 0.9 };
  }
  if (/\b(gap analysis|what am i missing|skill gap|missing skills|how close am i|career gap)\b/.test(text)) {
    return { intent: "GAP_ANALYSIS", confidence: 0.9 };
  }
  if (/\b(multiple versions|3 resumes|different resumes|persona|startup version|ai product version|generate versions)\b/.test(text)) {
    return { intent: "MULTI_PERSONA", confidence: 0.9 };
  }
  if (/\b(ats view|show ats|how does ats|ats parsing|ats simulation|robot view)\b/.test(text)) {
    return { intent: "VISUALIZE_ATS", confidence: 0.9 };
  }
  if (/\b(cover letter|cold email|dm recruiter|networking message|linkedin message|write outreach|apply with message)\b/.test(text)) {
    return { intent: "GENERATE_OUTREACH", confidence: 0.9 };
  }
  if (/\b(help|what can you|how do i|what should)\b/.test(text) && text.length < 80) {
    return { intent: "GENERAL_HELP", confidence: 0.7 };
  }
  // Default: if long text with career details, create resume; otherwise help
  if (text.length > 100 || /\b(build|create|make|resume|fresher|i am|i know|i have)\b/.test(text)) {
    return { intent: hasExistingResume ? "IMPROVE_RESUME" : "CREATE_RESUME", confidence: 0.7 };
  }

  return { intent: "GENERAL_HELP", confidence: 0.5 };
}

// ---------------------------------------------------------------------------
// Differentiation Feature Agents
// ---------------------------------------------------------------------------

/**
 * STAR Interviewer Agent — scans the profile and resume for vague bullets
 * and generates targeted follow-up questions to extract hidden value.
 */
export async function starInterviewAgent(
  profile: CareerProfile,
  resumeContent: CareerPathResumeContent,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<StarInterviewResult> {
  return callWithValidation<StarInterviewResult>(
    "StarInterviewAgent",
    StarInterviewSchema,
    [
      {
        role: "system",
        content:
          `You are an expert career coach conducting a STAR interview to extract hidden value from vague career descriptions.

Your job:
1. Scan the resume and profile for vague bullets (no metrics, no clear outcome, no proof)
2. Generate 4–6 highly targeted follow-up questions in STAR format (Situation, Task, Action, Result, Metric)
3. Each question should reference a specific project, role, or bullet point
4. Questions must be conversational and non-intimidating
5. Focus on quantitative outcomes: time saved, users helped, performance improvements, revenue impact, or problems solved

Do NOT make up answers. Only extract what the user actually did.
Return questions that, when answered, would transform a weak bullet into a compelling achievement.`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}\n\nCurrent Resume: ${JSON.stringify(resumeContent)}`,
      },
    ],
    "starInterview",
    StarInterviewSchema,
    () => ({
      questions: [
        { id: "q1", question: "What was the measurable outcome of your most impactful project?", context: "Metrics help recruiters trust your claims.", category: "result" as const },
        { id: "q2", question: "How many users or team members did your work affect?", context: "Scope helps establish seniority.", category: "metric" as const },
      ],
      vagueBullets: [],
      summary: "STAR follow-up questions generated.",
    }),
    { ...metadata, inputJson: { targetRole, profileId: profile.id } }
  );
}

/**
 * Anti-BS Humanizer Agent — strips AI-generated clichés and rewrites
 * bullets to sound genuinely human, punchy, and metric-driven.
 */
export async function humanizeResumeAgent(
  content: CareerPathResumeContent,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<HumanizedResume> {
  return callWithValidation<HumanizedResume>(
    "HumanizeAgent",
    HumanizedResumeSchema,
    [
      {
        role: "system",
        content:
          `You are an expert resume editor specializing in de-AI-ifying resumes. Recruiters are tired of AI-generated resumes.

Your job:
1. Identify and remove ALL AI clichés: "spearheaded", "leveraged", "synergized", "delved into", "dynamic", "passionate", "hardworking", "results-driven", "game-changing", "cutting-edge", "robust", "seamlessly", "orchestrated", "pivotal"
2. Replace them with direct, punchy, metric-focused language
3. Rewrite passive voice to active voice
4. Make sentences shorter and more direct — recruiters read fast
5. Preserve all factual information — do NOT add fake metrics or claims
6. Return the full rewritten resume content + a list of every change made
7. For each change, document the original text, new text, the reason, and the section

Example:
- BEFORE: "Spearheaded the development of a cutting-edge AI solution that leveraged advanced algorithms"
- AFTER: "Built an AI resume parser using Python and OpenAI API that reduced manual screening time"`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nResume to Humanize: ${JSON.stringify(content)}`,
      },
    ],
    "humanizedResume",
    HumanizedResumeSchema,
    undefined,
    { ...metadata, inputJson: { targetRole } }
  );
}

/**
 * Impact Estimator Agent — finds weak bullets without metrics and suggests
 * safe, industry-standard metric estimates the user can verify and accept.
 */
export async function estimateImpactAgent(
  profile: CareerProfile,
  content: CareerPathResumeContent,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<ImpactEstimateResult> {
  return callWithValidation<ImpactEstimateResult>(
    "ImpactEstimatorAgent",
    ImpactEstimateSchema,
    [
      {
        role: "system",
        content:
          `You are a resume impact estimator. Your job is to help users add safe, verifiable metrics to their resume bullets.

Your process:
1. Scan every project and experience bullet for missing quantitative proof
2. For each weak bullet, suggest a CONSERVATIVE, VERIFIABLE metric estimate
3. Explain your rationale (industry benchmarks, logical inference, typical outcomes)
4. Rate your confidence: high (user can easily verify), medium (plausible estimate), low (very rough)
5. Provide a fully rewritten bullet that incorporates the metric
6. NEVER make up large unrealistic numbers. Conservative is always better than impressive.

Examples of safe estimation:
- "Made database queries faster" → "Optimized PostgreSQL queries, reducing average load time from ~3s to ~0.8s (verified via browser devtools)"
- "Helped team members" → "Onboarded 3 junior developers to the codebase during their first week"
- "Built a chatbot" → "Built a customer support chatbot handling ~50 daily queries, reducing manual response time"

Only suggest metrics the user can plausibly verify or estimate from their own experience.`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}\n\nResume Content: ${JSON.stringify(content)}`,
      },
    ],
    "impactEstimate",
    ImpactEstimateSchema,
    () => ({ suggestions: [], summary: "No vague bullets detected that need metric estimation." }),
    { ...metadata, inputJson: { targetRole } }
  );
}

/**
 * Strategic Career Gap Analyzer — compares the user's profile against
 * the target role requirements and produces a detailed gap + action plan.
 */
export async function analyzeCareerGapAgent(
  profile: CareerProfile,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<GapAnalysisResult> {
  return callWithValidation<GapAnalysisResult>(
    "CareerGapAgent",
    GapAnalysisSchema,
    [
      {
        role: "system",
        content:
          `You are a strategic career advisor specializing in gap analysis between a candidate's current profile and their target role.

Your job:
1. Score the candidate's match to the target role on a 0–100 scale
2. List their genuine strengths relevant to the role
3. Identify critical and recommended skill/experience gaps
4. For each gap: provide a concrete weekend project idea that would demonstrate that skill
5. Suggest 3 specific buildable projects that fill the most critical gaps
6. Be honest — if they are far from ready, say so with a specific path to close the gap
7. Consider: skills, proof (projects/links), seniority level, domain knowledge, tools

A score of 70+ means ready to apply. Below 70, focus on building proof first.
Do not suggest skills they already have. Focus only on genuine gaps.`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}`,
      },
    ],
    "gapAnalysis",
    GapAnalysisSchema,
    undefined,
    { ...metadata, inputJson: { targetRole } }
  );
}

/**
 * Multi-Persona Resume Generator — generates 3 distinctly skewed resumes
 * from the user's master profile, emphasizing different role personas.
 */
export async function generatePersonaResumesAgent(
  profile: CareerProfile,
  masterContent: CareerPathResumeContent,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<MultiPersonaResult> {
  const roleVariants = [
    (profile.target.targetRoles?.[0]) || "Software Developer",
    "Frontend Developer",
    "Full Stack Developer",
  ].filter((role, index, arr) => arr.indexOf(role) === index).slice(0, 3);

  return callWithValidation<MultiPersonaResult>(
    "MultiPersonaAgent",
    MultiPersonaSchema,
    [
      {
        role: "system",
        content:
          `You are an expert resume strategist. You create multiple targeted resume versions from a single master profile.

Your job:
1. Generate exactly 3 resume persona variants based on the provided role variants
2. Each persona should emphasize DIFFERENT aspects of the same profile
3. Do NOT invent new skills or experience — only re-emphasize and re-frame existing ones
4. For each persona:
   - Change the summary to be role-specific
   - Reorder skills to put role-relevant ones first
   - Rewrite bullet points to emphasize role-relevant aspects
   - List what this persona emphasizes vs the others
5. The personas should feel genuinely different — a recruiter reading all 3 should find each one distinctly positioned

Role variants to generate: ${roleVariants.join(", ")}`,
      },
      {
        role: "user",
        content: `Master Profile: ${JSON.stringify(profile)}\n\nMaster Resume Content: ${JSON.stringify(masterContent)}`,
      },
    ],
    "multiPersona",
    MultiPersonaSchema,
    undefined,
    { ...metadata, inputJson: { roles: roleVariants } }
  );
}

/**
 * ATS View Agent — simulates how a legacy ATS system parses the resume,
 * identifying formatting issues and extraction failures.
 */
export async function generateATSViewAgent(
  content: CareerPathResumeContent,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<ATSParseResult> {
  return callWithValidation<ATSParseResult>(
    "ATSViewAgent",
    ATSParseSchema,
    [
      {
        role: "system",
        content:
          `You are simulating a legacy ATS (Applicant Tracking System) parser like Taleo, Workday, or Greenhouse.

Your job:
1. Parse the resume section by section as a dumb ATS would — plain text extraction, no formatting
2. For each section: show the raw text an ATS would extract, identify parsing issues
3. Flag issues like: two-column layouts (ATS cannot read column 2), tables (ATS skips them), headers/footers, special characters, graphics, non-standard section headings
4. Score each section's ATS compatibility (0–100)
5. List critical failures (sections ATS would miss entirely) and passed checks
6. Calculate an overall ATS compatibility score

Common ATS failures:
- Contact info not in main body (put in header/footer)
- Skills in a table or multi-column layout
- Non-standard section names ("What I've built" instead of "Projects")
- Missing standard keywords for the target role
- URLs not spelled out (linked text won't transfer)

Be specific and practical — every issue should have a clear fix.`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nResume Content: ${JSON.stringify(content)}`,
      },
    ],
    "atsView",
    ATSParseSchema,
    undefined,
    { ...metadata, inputJson: { targetRole } }
  );
}

/**
 * Outreach Generator Agent — produces a full suite of personalized
 * networking and application materials tailored to the specific job.
 */
export async function generateOutreachAgent(
  profile: CareerProfile,
  content: CareerPathResumeContent,
  jobDescription: string,
  targetRole: string,
  metadata?: { userId?: string; sessionId?: string; resumeId?: string }
): Promise<OutreachPack> {
  return callWithValidation<OutreachPack>(
    "OutreachAgent",
    OutreachPackSchema,
    [
      {
        role: "system",
        content:
          `You are a career outreach specialist. You write personalized, compelling, human-sounding outreach materials that get responses.

Your job: Generate a complete outreach pack including:
1. Cover Letter (3 short paragraphs, specific to the role, references actual project from profile)
2. Recruiter DM (LinkedIn DM, max 3 sentences, casual but professional)
3. Cold Email (subject line + 3 sentences, specific hook from JD)
4. LinkedIn Message (connection request message, max 300 chars)
5. Why This Role Answer (for "why do you want this job" interview question)
6. Follow-up Message (if no reply after 5 days)
7. 3 likely interview questions for this specific role + suggested answers using the candidate's real profile
8. List missing skills the candidate should prepare for before the interview
9. Preparation plan (5 actionable steps before applying)

Rules:
- Every piece must reference specific details from the job description
- Sound human — no AI clichés like "excited to leverage my skills"
- Use the candidate's actual projects and experience
- Never fabricate achievements not in the profile
- The cover letter should open with a specific, compelling hook`,
      },
      {
        role: "user",
        content: `Target Role: ${targetRole}\n\nJob Description: ${jobDescription}\n\nProfile: ${JSON.stringify(profile)}\n\nResume: ${JSON.stringify(content)}`,
      },
    ],
    "outreachPack",
    OutreachPackSchema,
    undefined,
    { ...metadata, inputJson: { targetRole, jobDescLength: jobDescription.length } }
  );
}
