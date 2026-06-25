import { NextResponse } from "next/server";
import { duplicateServerResume } from "@/lib/careerpath/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
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
