import { z } from "zod";
import { PROMPTS } from "../prompts";
import { zodResponseFormat } from "openai/helpers/zod";
import {
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
  getFallbackModel,
} from "../llm";
import { generateObject, generateText, type LanguageModel } from "ai";
import { saveAgentTelemetry, safeErrorSummary } from "../telemetry";
import { logger } from "@/lib/observability/logger";
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
  CareerWorkspaceState,
} from "../types";

async function callWithValidation<T>(
  agentName: string,
  schema: z.ZodType<any, any, any>,
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
  let lastError = "ProviderError";
  const modelsToTry: LanguageModel[] = [getModel(metadata?.fast)];
  const fallback = getFallbackModel(metadata?.fast);
  if (fallback) modelsToTry.push(fallback);

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const model = modelsToTry[attempt];
    try {
      const systemMessage = messages.find(m => m.role === "system")?.content;
      const chatMessages = messages.filter(m => m.role !== "system");
      const result = await generateObject({
        model,
        schema,
        system: systemMessage,
        messages: chatMessages as any,
        temperature: 0.2,
      });

      await saveAgentTelemetry({
        agentName,
        status: "completed",
        latencyMs: Date.now() - startMs,
        model: getModelName(model),
        sessionId: metadata?.sessionId,
        resumeId: metadata?.resumeId,
        userId: metadata?.userId,
        usage: result.usage,
        attempts: attempt + 1,
      }).catch(() => {});
      return result.object as T;
    } catch (err: unknown) {
      lastError = safeErrorSummary(err);
      logger.warn("[orchestrator] Agent attempt failed", { agentName, attempt: attempt + 1, error: lastError });
    }
  }

  await saveAgentTelemetry({
    agentName,
    status: "failed",
    error: lastError,
    latencyMs: Date.now() - startMs,
    model: getModelName(modelsToTry[modelsToTry.length - 1]),
    sessionId: metadata?.sessionId,
    resumeId: metadata?.resumeId,
    userId: metadata?.userId,
    attempts: modelsToTry.length,
  }).catch(() => {});

  if (fallbackFn) return fallbackFn();
  throw new Error(`${agentName} failed after ${modelsToTry.length} attempts: ${lastError}`);
}

function getModelName(model: unknown) {
  if (typeof model === "object" && model) {
    const candidate = model as { modelId?: unknown; id?: unknown };
    if (typeof candidate.modelId === "string") return candidate.modelId;
    if (typeof candidate.id === "string") return candidate.id;
  }
  return "unknown";
}

function fallbackGapReport(profile: CareerPathProfile): GapReport {
  const criticalMissing: string[] = [];
  const questionsToAsk: GapReport["questionsToAsk"] = [];
  if (!profile.target?.role) {
    criticalMissing.push("target role");
    questionsToAsk.push({ question: "What role are you targeting?", reason: "A target role anchors the resume summary, skills order, and project framing.", priority: "critical" });
  }
  if (!profile.education.length && !profile.projects.length && !profile.experience.length) {
    criticalMissing.push("career evidence");
    questionsToAsk.push({ question: "Can you share one project, education entry, internship, job, or achievement?", reason: "The resume needs at least one evidence section before generation.", priority: "critical" });
  }
  return { readyToGenerate: criticalMissing.length === 0, criticalMissing, recommendedMissing: [], resumeRisk: criticalMissing.length ? ["Insufficient evidence to generate a truthful resume."] : [], questionsToAsk };
}

export async function extractProfileDataAgent(input: string, existing: CareerPathProfile, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<CareerPathProfile> {
  type ParsedProfile = z.infer<typeof ProfileSchema>;
  const result = await callWithValidation<ParsedProfile>("ProfileExtractionAgent", ProfileSchema, [
    { role: "system", content: PROMPTS.PROFILE_EXTRACTION },
    { role: "user", content: `Existing Profile: ${JSON.stringify(existing)}\n\nNew Input: ${input}\n\nTarget Role (if any): ${targetRole}` },
  ], "profile", ProfileSchema, () => existing as unknown as ParsedProfile, { ...metadata, fast: true, inputJson: { inputLength: input.length, targetRole } });
  return { ...existing, ...result, id: existing.id, userId: existing.userId, target: { ...existing.target, ...result.target }, rawNotes: [existing.rawNotes, input].filter(Boolean).join("\n\n") } as CareerPathProfile;
}

export async function detectGapsAgent(profile: CareerPathProfile, mode: BuilderMode, metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<GapReport> {
  return callWithValidation<GapReport>("GapDetectionAgent", GapReportSchema, [
    { role: "system", content: PROMPTS.GAP_DETECTION },
    { role: "user", content: `Mode: ${mode}\nProfile: ${JSON.stringify(profile)}` },
  ], "gapReport", GapReportSchema, () => fallbackGapReport(profile), { ...metadata, fast: true, inputJson: { mode } });
}

export async function writeResumeAgent(profile: CareerPathProfile, mode: BuilderMode, jobDescription = "", metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<CareerPathResumeContent> {
  return callWithValidation<CareerPathResumeContent>("ResumeWriterAgent", ResumeContentSchema, [
    { role: "system", content: PROMPTS.RESUME_WRITER },
    { role: "user", content: `Profile: ${JSON.stringify(profile)}\nJob Description (if any): ${jobDescription}` },
  ], "resume", ResumeContentSchema, undefined, { ...metadata, fast: true, inputJson: { mode, jobDescriptionLength: jobDescription.length } });
}

export async function auditResumeAgent(contentParam: CareerPathResumeContent, targetRole: string, jobDescription = "", metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<CareerPathResumeAudit> {
  return callWithValidation<CareerPathResumeAudit>("ATSAuditAgent", ResumeAuditSchema, [
    { role: "system", content: PROMPTS.ATS_AUDIT },
    { role: "user", content: `Resume: ${JSON.stringify(contentParam)}\nTarget Role: ${targetRole}\nJob Description: ${jobDescription}` },
  ], "audit", ResumeAuditSchema, undefined, { ...metadata, fast: true, inputJson: { targetRole, jobDescriptionLength: jobDescription.length } });
}

export async function improveResumeAgent(contentParam: CareerPathResumeContent, audit: CareerPathResumeAudit, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<CareerPathResumeContent> {
  return callWithValidation<CareerPathResumeContent>("ResumeImprovementAgent", ResumeContentSchema, [
    { role: "system", content: PROMPTS.RESUME_IMPROVEMENT },
    { role: "user", content: `Resume: ${JSON.stringify(contentParam)}\nAudit: ${JSON.stringify(audit)}\nTarget Role: ${targetRole}` },
  ], "resume", ResumeContentSchema, undefined, { ...metadata, fast: true, inputJson: { targetRole } });
}

export async function tailorResumeAgent(resumeContent: CareerPathResumeContent, targetRole: string, jobDescription: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string; }): Promise<CareerPathTailoringResult> {
  return callWithValidation<CareerPathTailoringResult>("JobTailoringAgent", TailoringResultSchema, [
    { role: "system", content: PROMPTS.JOB_TAILORING },
    { role: "user", content: `Resume: ${JSON.stringify(resumeContent)}\nJob Description: ${jobDescription}\nTarget Role: ${targetRole}` },
  ], "tailoring", TailoringResultSchema, undefined, { ...metadata, fast: true, inputJson: { targetRole, jobDescriptionLength: jobDescription.length } });
}

export function inferIntentAgent(message: string): { intent: BuilderMode; targetRole: string; confidence: number; nextAction: string } {
  const text = message.toLowerCase();
  const intent: BuilderMode = text.includes("tailor") || text.includes("job description") ? "tailor" : text.includes("improve") || text.includes("existing resume") ? "improve" : "build";
  return { intent, targetRole: "", confidence: text.length > 10 ? 0.86 : 0.62, nextAction: intent === "tailor" ? "collect_resume_and_job" : "collect_profile_data" };
}

const IntentSchema = z.object({
  intent: z.enum(["CREATE_RESUME", "IMPROVE_RESUME", "TAILOR_TO_JOB", "ADD_INFORMATION", "REWRITE_SECTION", "ASK_MISSING_INFO", "GENERATE_PDF", "GENERAL_HELP"]),
  confidence: z.number(),
  reasoning: z.string(),
});

export async function inferIntentLLM(message: string, hasExistingResume: boolean, metadata?: { userId?: string; resumeId?: string }): Promise<{ intent: import("../types").AgentIntent; confidence: number }> {
  try {
    const result = await callWithValidation<z.infer<typeof IntentSchema>>("IntentInferenceAgent", IntentSchema, [
      { role: "system", content: PROMPTS.INTENT_INFERENCE.replace("{hasExistingResume}", hasExistingResume ? "HAS" : "does NOT have") },
      { role: "user", content: message.slice(0, 2000) },
    ], "intentClassification", IntentSchema, undefined, { ...metadata, fast: true, inputJson: { messageLength: Math.min(message.length, 2000) } });
    return { intent: result.intent, confidence: result.confidence };
  } catch {
    return inferIntentKeyword(message, hasExistingResume);
  }
}

export function inferIntentKeyword(message: string, hasExistingResume: boolean): { intent: import("../types").AgentIntent; confidence: number } {
  const text = message.toLowerCase();
  if (text.length > 500) {
    if (/\b(tailor|job description|match this jd|jd:)\b/.test(text) || /\b(responsibilities|qualifications|requirements|we are looking)\b/.test(text)) return { intent: "TAILOR_TO_JOB", confidence: 0.85 };
    return { intent: hasExistingResume ? "IMPROVE_RESUME" : "CREATE_RESUME", confidence: 0.7 };
  }
  if (/\b(download|export|print|pdf|save as)\b/.test(text)) return { intent: "GENERATE_PDF", confidence: 0.9 };
  if (/\b(tailor|job description|match this jd|jd:)\b/.test(text) || (text.length > 300 && /\b(responsibilities|qualifications|requirements|we are looking)\b/.test(text))) return { intent: "TAILOR_TO_JOB", confidence: 0.85 };
  if (/\b(add this project|add project|add certificate|add cert|add skill|add experience|add my github|add my linkedin)\b/.test(text)) return { intent: "ADD_INFORMATION", confidence: 0.85 };
  if (/\b(rewrite|change|modify|update)\b/.test(text) && /\b(summary|section|skills|bullets|project|experience|header)\b/.test(text)) return { intent: "REWRITE_SECTION", confidence: 0.8 };
  if (/\b(improve|stronger|better|ats friendly|make it ats|polish|enhance)\b/.test(text)) return { intent: "IMPROVE_RESUME", confidence: 0.8 };
  if (/\b(interview me|ask me questions|what should i say|star questions|tell me about yourself)\b/.test(text)) return { intent: "STAR_INTERVIEW", confidence: 0.9 };
  if (/\b(humanize|sounds like ai|remove ai|de-ai|natural language|ai speak|sounds robotic|too generic)\b/.test(text)) return { intent: "HUMANIZE_RESUME", confidence: 0.9 };
  if (/\b(add metrics|estimate impact|put numbers|quantify|add numbers|impact estimate)\b/.test(text)) return { intent: "ESTIMATE_IMPACT", confidence: 0.9 };
  if (/\b(gap analysis|what am i missing|skill gap|missing skills|how close am i|career gap)\b/.test(text)) return { intent: "GAP_ANALYSIS", confidence: 0.9 };
  if (/\b(multiple versions|3 resumes|different resumes|persona|startup version|ai product version|generate versions)\b/.test(text)) return { intent: "MULTI_PERSONA", confidence: 0.9 };
  if (/\b(ats view|show ats|how does ats|ats parsing|ats simulation|robot view)\b/.test(text)) return { intent: "VISUALIZE_ATS", confidence: 0.9 };
  if (/\b(cover letter|cold email|dm recruiter|networking message|linkedin message|write outreach|apply with message)\b/.test(text)) return { intent: "GENERATE_OUTREACH", confidence: 0.9 };
  if (/\b(help|what can you|how do i|what should)\b/.test(text) && text.length < 80) return { intent: "GENERAL_HELP", confidence: 0.7 };
  if (text.length > 100 || /\b(build|create|make|resume|fresher|i am|i know|i have)\b/.test(text)) return { intent: hasExistingResume ? "IMPROVE_RESUME" : "CREATE_RESUME", confidence: 0.7 };
  return { intent: "GENERAL_HELP", confidence: 0.5 };
}

export async function starInterviewAgent(profile: CareerProfile, resumeContent: CareerPathResumeContent, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<StarInterviewResult> {
  return callWithValidation<StarInterviewResult>("StarInterviewAgent", StarInterviewSchema, [
    { role: "system", content: PROMPTS.STAR_INTERVIEW },
    { role: "user", content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}\n\nCurrent Resume: ${JSON.stringify(resumeContent)}` },
  ], "starInterview", StarInterviewSchema, () => ({ questions: [
    { id: "q1", question: "What was the measurable outcome of your most impactful project?", context: "Metrics help recruiters trust your claims.", category: "result" as const },
    { id: "q2", question: "How many users or team members did your work affect?", context: "Scope helps establish seniority.", category: "metric" as const },
  ], vagueBullets: [], summary: "STAR follow-up questions generated." }), { ...metadata, inputJson: { targetRole, profileId: profile.id } });
}

export async function humanizeResumeAgent(content: CareerPathResumeContent, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<HumanizedResume> {
  return callWithValidation<HumanizedResume>("HumanizeAgent", HumanizedResumeSchema, [
    { role: "system", content: PROMPTS.HUMANIZE_RESUME },
    { role: "user", content: `Target Role: ${targetRole}\n\nResume to Humanize: ${JSON.stringify(content)}` },
  ], "humanizedResume", HumanizedResumeSchema, undefined, { ...metadata, inputJson: { targetRole } });
}

export async function estimateImpactAgent(profile: CareerProfile, content: CareerPathResumeContent, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<ImpactEstimateResult> {
  return callWithValidation<ImpactEstimateResult>("ImpactEstimatorAgent", ImpactEstimateSchema, [
    { role: "system", content: PROMPTS.IMPACT_ESTIMATOR },
    { role: "user", content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}\n\nResume Content: ${JSON.stringify(content)}` },
  ], "impactEstimate", ImpactEstimateSchema, () => ({ suggestions: [], summary: "No vague bullets detected that need metric estimation." }), { ...metadata, inputJson: { targetRole } });
}

export async function analyzeCareerGapAgent(profile: CareerProfile, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<GapAnalysisResult> {
  return callWithValidation<GapAnalysisResult>("CareerGapAgent", GapAnalysisSchema, [
    { role: "system", content: PROMPTS.CAREER_GAP },
    { role: "user", content: `Target Role: ${targetRole}\n\nProfile: ${JSON.stringify(profile)}` },
  ], "gapAnalysis", GapAnalysisSchema, undefined, { ...metadata, inputJson: { targetRole } });
}

export async function generatePersonaResumesAgent(profile: CareerProfile, masterContent: CareerPathResumeContent, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<MultiPersonaResult> {
  const roleVariants = [(profile.target.targetRoles?.[0]) || "Software Developer", "Frontend Developer", "Full Stack Developer"].filter((role, index, arr) => arr.indexOf(role) === index).slice(0, 3);
  return callWithValidation<MultiPersonaResult>("MultiPersonaAgent", MultiPersonaSchema, [
    { role: "system", content: PROMPTS.MULTI_PERSONA.replace("{roles}", roleVariants.join(", ")) },
    { role: "user", content: `Master Profile: ${JSON.stringify(profile)}\n\nMaster Resume Content: ${JSON.stringify(masterContent)}` },
  ], "multiPersona", MultiPersonaSchema, undefined, { ...metadata, inputJson: { roles: roleVariants } });
}

export async function generateATSViewAgent(content: CareerPathResumeContent, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<ATSParseResult> {
  return callWithValidation<ATSParseResult>("ATSViewAgent", ATSParseSchema, [
    { role: "system", content: PROMPTS.ATS_VIEW },
    { role: "user", content: `Target Role: ${targetRole}\n\nResume Content: ${JSON.stringify(content)}` },
  ], "atsView", ATSParseSchema, undefined, { ...metadata, inputJson: { targetRole } });
}

export async function generateOutreachAgent(profile: CareerProfile, content: CareerPathResumeContent, jobDescription: string, targetRole: string, metadata?: { userId?: string; sessionId?: string; resumeId?: string }): Promise<OutreachPack> {
  return callWithValidation<OutreachPack>("OutreachAgent", OutreachPackSchema, [
    { role: "system", content: PROMPTS.OUTREACH },
    { role: "user", content: `Target Role: ${targetRole}\n\nJob Description: ${jobDescription}\n\nProfile: ${JSON.stringify(profile)}\n\nResume: ${JSON.stringify(content)}` },
  ], "outreachPack", OutreachPackSchema, undefined, { ...metadata, inputJson: { targetRole, jobDescLength: jobDescription.length } });
}

export async function answerCareerQuestionAgent(question: string, workspace: CareerWorkspaceState, metadata?: { userId?: string; sessionId?: string; resumeId?: string; fast?: boolean }): Promise<string> {
  const startMs = Date.now();
  const model = getModel(metadata?.fast);
  try {
    const result = await generateText({
      model,
      system: PROMPTS.CAREER_QUESTION,
      prompt: `My Career Workspace Data:\n${JSON.stringify(workspace, null, 2)}\n\nMy Question:\n${question}`,
    });
    await saveAgentTelemetry({ agentName: "answerCareerQuestionAgent", status: "completed", latencyMs: Date.now() - startMs, model: getModelName(model), sessionId: metadata?.sessionId, resumeId: metadata?.resumeId, userId: metadata?.userId, usage: result.usage, attempts: 1 }).catch(() => {});
    return result.text;
  } catch (err: unknown) {
    const errorSummary = safeErrorSummary(err);
    logger.warn("[orchestrator] Career question generation failed", { error: errorSummary });
    await saveAgentTelemetry({ agentName: "answerCareerQuestionAgent", status: "failed", error: errorSummary, latencyMs: Date.now() - startMs, model: getModelName(model), sessionId: metadata?.sessionId, resumeId: metadata?.resumeId, userId: metadata?.userId, attempts: 1 }).catch(() => {});
    return "CareerOS could not complete that request right now. Please try again in a moment.";
  }
}
