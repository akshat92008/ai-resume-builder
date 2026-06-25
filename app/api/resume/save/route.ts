import { NextResponse } from "next/server";
import { saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { z } from "zod";

const SaveRequestSchema = z.object({
  resume: z.object({
    id: z.string(),
  }).passthrough(),
});

export async function POST(request: Request) {
  try {
    const text = await request.text().catch(() => "{}");
    if (text.length > 100000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = JSON.parse(text);
    const parseResult = SaveRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Resume data is required and invalid.", recoverable: true } },
        { status: 400 },
      );
    }
    const body = parseResult.data as { resume: CareerPathResume };

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
