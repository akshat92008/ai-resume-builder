import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getLatestResumeForUser, getLatestMessagesForUser } from "@/lib/careerpath/db";

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
    });
  } catch (err) {
    console.error("[app-state] Error:", err);
    return NextResponse.json(
      { error: { code: "STATE_LOAD_FAILED", message: "Unable to load workspace state.", recoverable: true } },
      { status: 500 },
    );
  }
}
