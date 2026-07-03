import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { getLatestMessagesForUser, getLatestResumeForUser, getServerResume } from "@/lib/careerpath/db";
import { logger } from "@/lib/observability/logger";

const StatusQuerySchema = z.object({
  after: z.string().datetime().optional(),
  resumeId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parseResult = StatusQuerySchema.safeParse({
      after: url.searchParams.get("after") || undefined,
      resumeId: url.searchParams.get("resumeId") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid status query.", recoverable: true } },
        { status: 400 },
      );
    }

    const userId = auth.user.id;
    const requestedResumeId = parseResult.data.resumeId;
    const resume = requestedResumeId
      ? await getServerResume(requestedResumeId, userId)
      : await getLatestResumeForUser(userId);
    const messages = await getLatestMessagesForUser(userId, resume?.id || requestedResumeId);
    const afterMs = parseResult.data.after ? Date.parse(parseResult.data.after) - 1000 : 0;
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && Date.parse(message.createdAt) > afterMs);

    return NextResponse.json({
      done: Boolean(latestAssistant),
      latestAssistant: latestAssistant || null,
      messages,
      resume: resume || null,
      resumeId: resume?.id || requestedResumeId || null,
      workspace: buildCareerWorkspaceState(resume || null),
    });
  } catch (err) {
    logger.error("[resume-agent/status] Error", { error: err });
    return NextResponse.json(
      { error: { code: "STATUS_LOAD_FAILED", message: "Unable to load agent status.", recoverable: true } },
      { status: 500 },
    );
  }
}
