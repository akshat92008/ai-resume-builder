import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { checkPromptInjection } from "@/lib/careerpath/guardrails";
import { getServerResume, saveResumeMessage } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState, routeCareerCommand } from "@/lib/careerpath/career-os";
import { answerCareerQuestionAgent, inferIntentLLM } from "@/lib/careerpath/orchestrator";
import { handleAnalyzeJobSearch, handleTrackJobApplication } from "@/inngest/handlers/career-handlers";
import { handleGenerateResumeVersion } from "@/inngest/handlers/resume-handlers";
import { inngest } from "@/inngest/client";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import type { AgentIntent } from "@/lib/careerpath/types";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 30_000;
const RequestSchema = z.object({
  message: z.string().trim().min(1).max(20_000),
  resumeId: z.string().uuid().optional(),
}).strict();

async function respondWithImmediateResult<T extends { assistantMessage: string; resumeId?: string | null }>(input: {
  result: T;
  userId: string;
  intent: AgentIntent;
  operationId: string;
  fallbackResumeId?: string | null;
}) {
  await saveResumeMessage({
    userId: input.userId,
    resumeId: input.result.resumeId || input.fallbackResumeId || null,
    role: "assistant",
    content: input.result.assistantMessage,
    intent: input.intent,
    operationId: input.operationId,
  });

  return NextResponse.json({ ...input.result, operationId: input.operationId });
}

function isOptimizeLinkedInCommand(command: unknown) {
  return Boolean(
    command &&
    typeof command === "object" &&
    "intent" in command &&
    (command as { intent?: string }).intent === "optimize_linkedin",
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
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkRateLimit(userId, ipHash, "resume_agent", entitlements.aiActionsPerDay);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "You've reached the usage limit. Please wait and try again.", recoverable: true } },
        { status: 429 },
      );
    }

    const safetyCheck = await checkPromptInjection(message);
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

    let intent: AgentIntent;
    if (command.intent === "generate_application_pack") intent = "GENERATE_APPLICATION_PACK";
    else if (command.intent === "track_job_application") intent = "TRACK_JOB_APPLICATION";
    else if (command.intent === "analyze_job_search") intent = "ANALYZE_JOB_SEARCH";
    else if (command.intent === "generate_resume_version") intent = "GENERATE_RESUME_VERSION";
    else if (command.intent === "optimize_linkedin") intent = "GENERAL_HELP";
    else if (command.intent === "log_achievement" || (command.intent === "build_career_profile" && currentResume)) intent = currentResume ? "ADD_INFORMATION" : "CREATE_RESUME";
    else intent = (await inferIntentLLM(message, !!currentResume, { userId, resumeId })).intent;

    const operationId = crypto.randomUUID();
    await saveResumeMessage({
      userId,
      resumeId: resumeId || null,
      role: "user",
      content: message,
      intent,
      operationId,
    });

    // Fast, deterministic and single-call intents should never wait behind a background queue.
    // These paths complete inline so tracking a job or asking a career question feels interactive.
    if (intent === "TRACK_JOB_APPLICATION") {
      return respondWithImmediateResult({
        result: await handleTrackJobApplication(message, currentResume, userId),
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    if (intent === "ANALYZE_JOB_SEARCH") {
      return respondWithImmediateResult({
        result: await handleAnalyzeJobSearch(currentResume),
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    if (intent === "GENERATE_RESUME_VERSION") {
      return respondWithImmediateResult({
        result: await handleGenerateResumeVersion(message, currentResume),
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    if (intent === "ASK_MISSING_INFO") {
      return respondWithImmediateResult({
        result: {
          assistantMessage: "What information would you like to provide? You can share your education, skills, projects, experience, or any career details.",
          resume: currentResume,
          resumeId: currentResume?.id || null,
          workspace: buildCareerWorkspaceState(currentResume),
        },
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    if (intent === "GENERATE_PDF") {
      return respondWithImmediateResult({
        result: {
          assistantMessage: "To download your resume as PDF, click the **PDF** button in the top bar. It will open the browser print dialog so you can save the verified resume as a PDF.",
          resume: currentResume,
          resumeId: currentResume?.id || null,
          workspace: buildCareerWorkspaceState(currentResume),
        },
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    if (intent === "GENERAL_HELP") {
      const workspace = buildCareerWorkspaceState(currentResume);
      const linkedIn = workspace.linkedInOptimization;
      const assistantMessage = isOptimizeLinkedInCommand(command)
        ? linkedIn
          ? `LinkedIn optimization is ready.\n\nHeadline: ${linkedIn.headline}\n\nAbout: ${linkedIn.about}\n\nTop skills: ${linkedIn.skills.slice(0, 8).join(", ") || "Add more skills to Career Memory."}`
          : "Build Career Memory first, then I can generate LinkedIn headline, About, experience updates, skills, Featured items, and SEO keywords."
        : await answerCareerQuestionAgent(message, workspace, { userId, resumeId, fast: true });

      return respondWithImmediateResult({
        result: {
          assistantMessage,
          resume: currentResume,
          resumeId: currentResume?.id || null,
          workspace,
        },
        userId,
        intent,
        operationId,
        fallbackResumeId: resumeId,
      });
    }

    // Multi-step resume creation / improvement stays durable in Inngest, but every
    // provider call now has a hard deadline so a stalled model cannot hang a run forever.
    const job = await inngest.send({
      name: "resume/process.intent",
      data: { intent, message, currentResume, userId, resumeId, command, operationId },
    });

    return NextResponse.json({
      jobId: job.ids[0],
      operationId,
      status: "queued",
      assistantMessage: "I’m working on it now. I’ll update this chat as soon as the agent finishes.",
    });
  } catch (error) {
    logger.error("[api/resume-agent] Failed to start operation", { error });
    return NextResponse.json(
      { error: { code: "AGENT_START_FAILED", message: "Unable to start the CareerOS agent right now.", recoverable: true } },
      { status: 500 },
    );
  }
}
