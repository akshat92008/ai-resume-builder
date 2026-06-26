import { NextResponse } from "next/server";
import { auditResumeAgent } from "@/lib/careerpath/orchestrator";
import { getServerResume, saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { z } from "zod";

const AuditRequestSchema = z.object({
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
    const parseResult = AuditRequestSchema.safeParse(json);
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
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "resume_audit", 10);
    
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

    const audit = await auditResumeAgent(resume.content, resume.targetRole, resume.jobDescription);
    const updated = { ...resume, audit, score: audit.score, updatedAt: new Date().toISOString() };
    await saveServerResume(updated as CareerPathResume);

    return NextResponse.json({ score: audit.score, audit, resume: updated });
  } catch (err) {
    console.error("[api/resume/audit] Error:", err);
    return NextResponse.json(
      { error: { code: "AUDIT_FAILED", message: "Unable to audit resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
