import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { checkPromptInjection } from "@/lib/careerpath/guardrails";
import { getServerResume, saveResumeMessage } from "@/lib/careerpath/db";
import { routeCareerCommand } from "@/lib/careerpath/career-os";
import { inferIntentLLM } from "@/lib/careerpath/orchestrator";
import { inngest } from "@/inngest/client";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import type { AgentIntent } from "@/lib/careerpath/types";

export const runtime = "nodejs";

const RequestSchema = z.object({
  message: z.string().min(1).max(20000),
  resumeId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const json = await request.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request. Provide a message.", recoverable: true } },
        { status: 400 },
      );
    }
    const { message, resumeId } = parseResult.data;

    const ipHash = getClientIp(request);
    const maxLimit = userId ? 15 : 3; // Stricter quotas
    const rateLimit = await checkRateLimit(userId, ipHash, "resume_agent", maxLimit);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "You've reached the usage limit. Please wait and try again.", recoverable: true } },
        { status: 429 },
      );
    }

    // Guardrails
    const safetyCheck = await checkPromptInjection(message);
    if (!safetyCheck.isSafe) {
      return NextResponse.json(
        { error: { code: "UNSAFE_INPUT", message: "Your input triggered our safety filters. Please try rephrasing.", recoverable: true } },
        { status: 400 },
      );
    }

    // Load existing resume if provided
    let currentResume = null;
    if (resumeId) {
      currentResume = await getServerResume(resumeId, userId);
    }

    const command = routeCareerCommand(message, {
      profile: currentResume?.careerProfile,
      resume: currentResume,
      applications: currentResume?.applications,
    });

    // Infer intent
    let intent: AgentIntent;
    
    if (command.intent === "generate_application_pack") {
      intent = "GENERATE_APPLICATION_PACK";
    } else if (command.intent === "track_job_application") {
      intent = "TRACK_JOB_APPLICATION";
    } else if (command.intent === "analyze_job_search") {
      intent = "ANALYZE_JOB_SEARCH";
    } else if (command.intent === "generate_resume_version") {
      intent = "GENERATE_RESUME_VERSION";
    } else if (command.intent === "optimize_linkedin") {
      intent = "GENERAL_HELP";
    } else if (command.intent === "log_achievement" || (command.intent === "build_career_profile" && currentResume)) {
      intent = currentResume ? "ADD_INFORMATION" : "CREATE_RESUME";
    } else {
      const result = await inferIntentLLM(message, !!currentResume, { userId, resumeId });
      intent = result.intent;
    }

    const queuedAt = new Date().toISOString();
    await saveResumeMessage({
      userId,
      resumeId: resumeId || null,
      role: "user",
      content: message,
      intent,
    });

    const job = await inngest.send({
      name: "resume/process.intent",
      data: {
        intent,
        message,
        currentResume,
        userId,
        resumeId,
        command,
      }
    });

    return NextResponse.json({
      jobId: job.ids[0],
      queuedAt,
      status: "queued",
      assistantMessage: "I’m working on it now. I’ll update this chat as soon as the agent finishes.",
    });

  } catch (err) {
    logger.error("[resume-agent] Error", { error: err });
    return NextResponse.json(
      {
        error: {
          code: "AGENT_ERROR",
          message: `Something went wrong: ${err instanceof Error ? err.message : String(err)}. Please try again.`,
          recoverable: true,
        },
      },
      { status: 500 },
    );
  }
}
