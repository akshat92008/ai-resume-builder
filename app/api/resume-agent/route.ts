import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { checkPromptInjection } from "@/lib/careerpath/guardrails";
import { getServerResume, ResumeConflictError, saveResumeMessage } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState, routeCareerCommand } from "@/lib/careerpath/career-os";
import { inferIntentKeyword, inferIntentLLM } from "@/lib/careerpath/orchestrator";
import { processCareerIntent } from "@/lib/careerpath/process-intent";
import { safeErrorSummary } from "@/lib/careerpath/telemetry";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import type { AgentIntent } from "@/lib/careerpath/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY_BYTES = 30_000;
const RequestSchema = z.object({
  message: z.string().trim().min(1).max(20_000),
  resumeId: z.string().uuid().optional(),
}).strict();

type AgentError = {
  code: string;
  message: string;
  recoverable: boolean;
};

function mapCommandIntent(commandIntent: string, hasResume: boolean): AgentIntent | null {
  switch (commandIntent) {
    case "generate_application_pack": return "GENERATE_APPLICATION_PACK";
    case "track_job_application": return "TRACK_JOB_APPLICATION";
    case "analyze_job_search": return "ANALYZE_JOB_SEARCH";
    case "tailor_resume_to_job": return "TAILOR_TO_JOB";
    case "generate_resume_version": return "GENERATE_RESUME_VERSION";
    case "improve_resume": return "IMPROVE_RESUME";
    case "optimize_linkedin": return "GENERAL_HELP";
    case "log_achievement": return hasResume ? "ADD_INFORMATION" : "CREATE_RESUME";
    case "build_career_profile": return hasResume ? "ADD_INFORMATION" : "CREATE_RESUME";
    default: return null;
  }
}

function intentUsesAi(intent: AgentIntent, commandIntent: string) {
  if (intent === "TRACK_JOB_APPLICATION" || intent === "ANALYZE_JOB_SEARCH" || intent === "GENERATE_RESUME_VERSION" || intent === "GENERATE_PDF" || intent === "ASK_MISSING_INFO") {
    return false;
  }
  if (intent === "GENERAL_HELP" && commandIntent === "optimize_linkedin") return false;
  return true;
}

async function respondWithResult<T extends { assistantMessage: string; resumeId?: string | null }>(input: {
  result: T;
  userId: string;
  intent: AgentIntent;
  operationId: string;
  fallbackResumeId?: string | null;
  status?: "completed" | "failed";
  error?: AgentError;
  httpStatus?: number;
}) {
  await saveResumeMessage({
    userId: input.userId,
    resumeId: input.result.resumeId || input.fallbackResumeId || null,
    role: "assistant",
    content: input.result.assistantMessage,
    intent: input.intent,
    operationId: input.operationId,
  });

  return NextResponse.json(
    {
      ...input.result,
      status: input.status || "completed",
      operationId: input.operationId,
      ...(input.error ? { error: input.error } : {}),
    },
    { status: input.httpStatus || 200 },
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const parsed = await readJsonLimited(request, MAX_BODY_BYTES, RequestSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: {
            code: parsed.code,
            message: parsed.code === "PAYLOAD_TOO_LARGE"
              ? "Agent requests must be 30 KB or smaller."
              : "Invalid request. Provide a message and a valid resume ID if supplied.",
            recoverable: true,
          },
        },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const { message, resumeId } = parsed.data;
    const ipHash = getClientIp(request);

    let currentResume = null;
    if (resumeId) {
      currentResume = await getServerResume(resumeId, userId);
      if (!currentResume || currentResume.userId !== userId) {
        return NextResponse.json(
          { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
          { status: 404 },
        );
      }
    }

    const command = routeCareerCommand(message, {
      profile: currentResume?.careerProfile,
      resume: currentResume,
      applications: currentResume?.applications,
    });

    let quotaConsumed = false;
    async function consumeAiQuota() {
      if (quotaConsumed) return null;
      const entitlements = await getCurrentUserEntitlements();
      const rateLimit = await checkRateLimit(userId, ipHash, "resume_agent", entitlements.aiActionsPerDay);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: { code: "RATE_LIMIT_EXCEEDED", message: "You've reached the AI usage limit. Please wait and try again.", recoverable: true } },
          { status: 429 },
        );
      }
      quotaConsumed = true;
      return null;
    }

    let intent = mapCommandIntent(command.intent, Boolean(currentResume));
    if (!intent) {
      const keywordIntent = inferIntentKeyword(message, Boolean(currentResume));
      if (keywordIntent.confidence >= 0.85 && keywordIntent.intent !== "GENERAL_HELP") {
        intent = keywordIntent.intent;
      }
    }

    // Known product commands and high-confidence local intent matches only need
    // deterministic injection protection. Unknown conversational input retains
    // the semantic classifier, and that classifier is counted as an AI action.
    const needsSemanticGuardrail = !intent;
    if (needsSemanticGuardrail) {
      const limited = await consumeAiQuota();
      if (limited) return limited;
    }

    const safetyCheck = await checkPromptInjection(message, { semantic: needsSemanticGuardrail });
    if (!safetyCheck.isSafe) {
      logger.warn("[api/resume-agent] Prompt injection blocked", {
        userId,
        reason: safetyCheck.reason,
      });
      return NextResponse.json(
        {
          error: {
            code: "UNSAFE_INPUT",
            message: "CareerOS blocked a likely instruction to override or reveal protected system rules. Resume text, career facts and job descriptions are allowed — remove phrases asking the assistant to ignore, reveal, bypass or override its safeguards, then try again.",
            recoverable: true,
          },
        },
        { status: 400 },
      );
    }

    if (!intent) {
      const limited = await consumeAiQuota();
      if (limited) return limited;
      intent = (await inferIntentLLM(message, Boolean(currentResume), { userId, resumeId })).intent;
    }

    if (intentUsesAi(intent, command.intent)) {
      const limited = await consumeAiQuota();
      if (limited) return limited;
    }

    const operationId = crypto.randomUUID();
    await saveResumeMessage({
      userId,
      resumeId: resumeId || null,
      role: "user",
      content: message,
      intent,
      operationId,
    });

    // Interactive CareerOS actions execute in the request instead of waiting on
    // a background queue. Provider calls are hard-bounded in llm.ts, making the
    // latency predictable while preserving the same verified-resume pipeline.
    try {
      const result = await processCareerIntent(
        intent,
        message,
        currentResume,
        userId,
        resumeId,
        command,
      );

      return respondWithResult({
        result,
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
        status: "completed",
      });
    } catch (error) {
      const conflict = error instanceof ResumeConflictError;
      logger.warn("[api/resume-agent] Interactive operation failed cleanly", {
        intent,
        operationId,
        error: safeErrorSummary(error),
      });
      const result = {
        assistantMessage: conflict
          ? "This workspace changed while CareerOS was processing your request. Reload the latest state and retry so no newer work is overwritten."
          : "CareerOS could not finish this run within the execution window. Your last saved workspace state is still available. Please retry once.",
        resume: currentResume,
        resumeId: currentResume?.id || resumeId || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };

      return respondWithResult({
        result,
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
        status: "failed",
        error: {
          code: conflict ? "RESUME_CONFLICT" : "AGENT_EXECUTION_FAILED",
          message: result.assistantMessage,
          recoverable: true,
        },
        httpStatus: conflict ? 409 : 200,
      });
    }
  } catch (error) {
    logger.error("[api/resume-agent] Failed to execute operation", { error });
    return NextResponse.json(
      { error: { code: "AGENT_START_FAILED", message: "Unable to run the CareerOS agent right now.", recoverable: true } },
      { status: 500 },
    );
  }
}
