import { NextResponse } from "next/server";
import { saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { getServerResume } from "@/lib/careerpath/db";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { z } from "zod";

const SaveRequestSchema = z.object({
  resume: ResumePayloadSchema,
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

    if (isServerSupabaseConfigured) {
      const auth = await requireAiAccess();
      if (!auth.ok) return auth.response;
      const user = auth.user;
      
      if (user) {
        if (body.resume.id) {
          const existing = await getServerResume(body.resume.id);
          if (existing && existing.userId && existing.userId !== user.id) {
            return NextResponse.json(
              { error: { code: "FORBIDDEN", message: "You do not own this resume.", recoverable: true } },
              { status: 403 }
            );
          }
        }
        body.resume.userId = user.id;
      }
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
