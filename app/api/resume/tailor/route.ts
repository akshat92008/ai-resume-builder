import { NextResponse } from "next/server";
import { auditResumeAgent, tailorResumeAgent } from "@/lib/careerpath/orchestrator";
import { createResumeRecord } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume, getSupabaseUser } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { requireAiAccess, requireProductionPersistence } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { z } from "zod";

const TailorRequestSchema = z.object({
  resumeId: z.string().optional(),
  resume: ResumePayloadSchema.optional(),
  jobDescription: z.string().max(15000).optional(),
});

export async function POST(request: Request) {
  try {
    const prodBlock = requireProductionPersistence();
    if (prodBlock) return prodBlock;

    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const text = await request.text().catch(() => "{}");
    if (text.length > 100000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = JSON.parse(text);
    const parseResult = TailorRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid payload or job description too long.", recoverable: true } },
        { status: 400 },
      );
    }
    const body = parseResult.data as { resumeId?: string; resume?: CareerPathResume; jobDescription?: string };

    if (isServerSupabaseConfigured && !body.resumeId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "resumeId is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const ipHash = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "resume_tailor", 3);
    
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
    if (!body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Job description is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const metadata = { userId: auth.user?.id, resumeId: resume.id };
    const tailoring = await tailorResumeAgent(resume.content, resume.targetRole, body.jobDescription, metadata);
    const audit = await auditResumeAgent(tailoring.tailoredResume, resume.targetRole, body.jobDescription, metadata);
    const tailored = createResumeRecord({
      mode: "tailor",
      targetRole: resume.targetRole,
      content: tailoring.tailoredResume,
      profile: resume.profile,
      jobDescription: body.jobDescription,
      version: resume.version + 1,
      title: `${resume.targetRole} Tailored Resume`,
    });
    tailored.tailoring = tailoring;
    tailored.audit = audit;
    tailored.score = audit.score;
    await saveServerResume(tailored);

    return NextResponse.json({
      newResumeId: tailored.id,
      matchScore: tailoring.matchScore,
      matchedKeywords: tailoring.matchedKeywords,
      missingKeywords: tailoring.missingKeywordsNotAdded,
      tailoredContent: tailoring.tailoredResume,
      tailoring,
      resume: tailored,
    });
  } catch (err) {
    console.error("[api/resume/tailor] Error:", err);
    return NextResponse.json(
      { error: { code: "TAILOR_FAILED", message: "Unable to tailor resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
