import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { DatabaseUnavailableError, duplicateServerResume } from "@/lib/careerpath/db";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { logger } from "@/lib/observability/logger";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID.", recoverable: true } }, { status: 400 });
    }
    const copy = await duplicateServerResume(id, auth.user.id);
    if (!copy) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    return NextResponse.json({ resume: copy });
  } catch (err) {
    logger.error("[api/resume/[id]/duplicate] Error", { error: err });
    const unavailable = err instanceof DatabaseUnavailableError;
    return NextResponse.json(
      {
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "DUPLICATE_FAILED",
          message: unavailable ? "Resume data is temporarily unavailable. Please retry." : "Unable to duplicate resume.",
          recoverable: true,
        },
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
