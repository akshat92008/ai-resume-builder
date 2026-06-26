import { NextResponse } from "next/server";
import { auditResumeAgent, improveResumeAgent } from "@/lib/careerpath/orchestrator";
import { getServerResume, saveServerResume, getSupabaseUser } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { z } from "zod";

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
    const json = JSON.parse(text);
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

    const resume = body.resume ?? (body.resumeId ? await getServerResume(body.resumeId) : null);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const startingAudit = resume.audit ?? await auditResumeAgent(resume.content, resume.targetRole, resume.jobDescription);
    const content = await improveResumeAgent(resume.content, startingAudit, resume.targetRole);
    const audit = await auditResumeAgent(content, resume.targetRole, resume.jobDescription);
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
