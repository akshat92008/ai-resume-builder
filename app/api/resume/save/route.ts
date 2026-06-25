import { NextResponse } from "next/server";
import { saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { resume?: CareerPathResume };
    if (!body.resume?.id) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Resume data is required.", recoverable: true } },
        { status: 400 },
      );
    }

    await saveServerResume(body.resume);
    return NextResponse.json({ resumeId: body.resume.id, saved: true });
  } catch (err) {
    console.error("[api/resume/save] Error:", err);
    return NextResponse.json(
      { error: { code: "SAVE_FAILED", message: "Unable to save resume.", recoverable: true } },
      { status: 500 },
    );
  }
}
