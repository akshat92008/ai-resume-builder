import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { requireAppAccess } from "@/lib/careerpath/auth";
import { DatabaseUnavailableError, getLatestResumeForUser, getLatestMessagesForUser } from "@/lib/careerpath/db";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { normalizeResumeContent } from "@/lib/careerpath/resume-content-normalization";
import { logger } from "@/lib/observability/logger";

/** Load the authenticated user's current CareerOS workspace state. */
export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const resume = await getLatestResumeForUser(userId);
    const applications = await listJobApplications(userId);
    if (resume) {
      // Older Career Memory-only rows were persisted before all resume-content
      // arrays became required. Normalize at this read boundary so those records
      // remain usable and cannot crash workspace derivation.
      resume.content = normalizeResumeContent(resume.content);
      resume.applications = applications;
    }
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
    const unavailable = err instanceof DatabaseUnavailableError;
    return NextResponse.json(
      {
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "STATE_LOAD_FAILED",
          message: unavailable ? "CareerOS data is temporarily unavailable. Please retry." : "Unable to load workspace state.",
          recoverable: true,
        },
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
