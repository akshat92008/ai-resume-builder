import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, getLatestMessagesForUser } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { logger } from "@/lib/observability/logger";

/**
 * GET /api/app-state
 *
 * Load the authenticated user's current workspace state:
 * - Latest resume
 * - Chat messages for that resume
 */
export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const resume = await getLatestResumeForUser(userId);
    const messages = resume
      ? await getLatestMessagesForUser(userId, resume.id)
      : [];

    return NextResponse.json({
      resume: resume || null,
      resumeId: resume?.id || null,
      messages,
      workspace: buildCareerWorkspaceState(resume),
    });
  } catch (err) {
    logger.error("[app-state] Error", { error: err });
    return NextResponse.json(
      { error: { code: "STATE_LOAD_FAILED", message: "Unable to load workspace state.", recoverable: true } },
      { status: 500 },
    );
  }
}
