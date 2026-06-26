import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { duplicateServerResume } from "@/lib/careerpath/db";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID.", recoverable: true } }, { status: 400 });
    }
    const copy = await duplicateServerResume(id);
    if (!copy) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    return NextResponse.json({ resume: copy });
  } catch (err) {
    console.error("[api/resume/[id]/duplicate] Error:", err);
    return NextResponse.json(
      { error: { code: "DUPLICATE_FAILED", message: "Unable to duplicate resume.", recoverable: true } },
      { status: 500 },
    );
  }
}
