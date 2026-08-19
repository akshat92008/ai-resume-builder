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
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import type { AgentIntent } from "@/lib/careerpath/types";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 30_000;
const RequestSchema = z.object({
  message: z.string().trim().min(1).max(20_000),
  resumeId: z.string().uuid().optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const raw = await request.text().catch(() => "");
    if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Agent requests must be 30 KB or smaller.", recoverable: true } },
        { status: 413 },
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Provide a valid JSON request.", recoverable: true } },
        { status: 400 },
      );
    }

    const parseResult = RequestSchema.safeParse(decoded);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request. Provide a message and a valid resume ID if supplied.", recoverable: true } },
        { status: 400 },
      );
    }
    const { message, resumeId } = parseResult.data;

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
      return NextResponse.json(
        { error: { code: "UNSAFE_INPUT", message: "Your input triggered our safety filters. Please try rephrasing.", recoverable: true } },
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

    const queuedAt = new Date().toISOString();
    await saveResumeMessage({ userId, resumeId: resumeId || null, role: "user", content: message, intent });

    const job = await inngest.send({
      name: "resume/process.intent",
      data: { intent, message, currentResume, userId, resumeId, command },
    });

    return NextResponse.json({
      jobId: job.ids[0],
      queuedAt,
      status: "queued",
      assistantMessage: "I’m working on it now. I’ll update this chat as soon as the agent finishes.",
    });
  } catch (error: unknown) {
    logger.error("[resume-agent] Error", { error });
    return NextResponse.json(
      { error: { code: "AGENT_ERROR", message: "Something went wrong while starting the agent. Please try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
