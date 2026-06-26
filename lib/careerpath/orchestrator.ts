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
} from "./llm";
import { detectGaps } from "./agents";
import { saveAgentRun } from "./db";
import type {
  CareerPathProfile,
  BuilderMode,
  GapReport,
  CareerPathResumeContent,
  CareerPathResumeAudit,
  CareerPathTailoringResult,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callWithValidation<T>(
  agentName: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
  messages: { role: "system" | "user"; content: string }[],
  formatName: string,
  zodSchema: Parameters<typeof zodResponseFormat>[0],
  fallbackFn?: () => T,
  metadata?: {
    sessionId?: string;
    resumeId?: string;
    userId?: string;
    inputJson?: unknown;
  }
): Promise<T> {
  const startMs = Date.now();
  const model = getModel();
  let lastError: string | undefined;
  
  const inputJson = metadata?.inputJson ?? messages;
  const provider = process.env.AI_PROVIDER || "nvidia";

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const openai = getAiClient();
      
      const reqPayload: any = {
        model,
        messages: attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user" as const,
                content: "The previous output was malformed. Please return valid JSON matching the required schema exactly.",
              },
            ],
      };

      if (provider === "nvidia") {
        const jsonSchema = zodResponseFormat(zodSchema as any, formatName).json_schema.schema;
        reqPayload.extra_body = { nvext: { guided_json: jsonSchema } };
      } else {
        reqPayload.response_format = zodResponseFormat(zodSchema as any, formatName);
      }

      const completion = await openai.chat.completions.create(reqPayload, { signal: controller.signal });

      clearTimeout(timeout);
      const content = completion.choices[0].message.content;
      if (!content) throw new Error(`Empty response from ${agentName}`);

      const parsed = JSON.parse(content);
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
    { ...metadata, inputJson: { input, targetRole } }
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
    { ...metadata, inputJson: { profile, mode } }
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
    { ...metadata, inputJson: { profile, mode, jobDescription } }
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
    { ...metadata, inputJson: { content: contentParam, targetRole, jobDescription } }
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
    { ...metadata, inputJson: { content: resumeContent, targetRole, jobDescription } }
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

function inferIntentKeyword(
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
  if (/\b(help|what can you|how do i|what should)\b/.test(text) && text.length < 80) {
    return { intent: "GENERAL_HELP", confidence: 0.7 };
  }
  // Default: if long text with career details, create resume; otherwise help
  if (text.length > 100 || /\b(build|create|make|resume|fresher|i am|i know|i have)\b/.test(text)) {
    return { intent: hasExistingResume ? "IMPROVE_RESUME" : "CREATE_RESUME", confidence: 0.7 };
  }

  return { intent: "GENERAL_HELP", confidence: 0.5 };
}

