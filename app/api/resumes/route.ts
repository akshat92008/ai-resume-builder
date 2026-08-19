import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { DatabaseUnavailableError, listServerResumeSummaries } from "@/lib/careerpath/db";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { logger } from "@/lib/observability/logger";

export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const resumes = await listServerResumeSummaries();
    return NextResponse.json({ resumes });
  } catch (err) {
    logger.error("[api/resumes] Error", { error: err });
    const unavailable = err instanceof DatabaseUnavailableError;
    return NextResponse.json(
      {
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "LIST_FAILED",
          message: unavailable ? "Resumes are temporarily unavailable. Please retry." : "Unable to load resumes.",
          recoverable: true,
        },
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
