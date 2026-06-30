import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { getServerResume, saveServerResume, getSupabaseUser } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/careerpath/api-utils";
import { z } from "zod";
import { handleResumeMessage } from "@/lib/resume/agent";
import { deriveRenderableResume } from "@/lib/resume/render";
import { contentToResumeState } from "@/lib/resume/types";
import { auditResume } from "@/lib/careerpath/agents";

const ImproveRequestSchema = z.object({
  resumeId: z.string().optional(),
  resume: ResumePayloadSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const text = await request.text().catch(() => "{}");
    if (text.length > 100000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = parseJsonBody(text);
    if ("error" in json && json.error === "INVALID_JSON") {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Invalid JSON body.", recoverable: false } },
        { status: 400 }
      );
    }
    const parseResult = ImproveRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid payload.", recoverable: true } },
        { status: 400 },
      );
    }
    const body = parseResult.data as { resumeId?: string; resume?: CareerPathResume };

    if (isServerSupabaseConfigured && !body.resumeId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "resumeId is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const ipHash = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "resume_improve", 5);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const resume = isServerSupabaseConfigured
      ? await getServerResume(body.resumeId!)
      : body.resume ?? (body.resumeId ? await getServerResume(body.resumeId) : null);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const state = contentToResumeState(resume.content, { id: resume.id, targetRole: resume.targetRole });
    const brain = await handleResumeMessage({
      userMessage: "Make it ATS friendly and improve bullets without adding unsupported facts.",
      currentResume: state,
    });
    const content = deriveRenderableResume(brain.resume || state);
    const audit = auditResume(content, resume.targetRole, resume.jobDescription);
    const updated: CareerPathResume = {
      ...resume,
      content,
      audit,
      score: audit.score,
      status: "final",
      updatedAt: new Date().toISOString(),
    };
    await saveServerResume(updated);

    return NextResponse.json({ resumeId: updated.id, content, score: audit.score, audit, resume: updated });
  } catch (err) {
    console.error("[api/resume/improve] Error:", err);
    return NextResponse.json(
      { error: { code: "IMPROVE_FAILED", message: "Unable to improve resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
