import { NextResponse } from "next/server";

export const maxDuration = 60;
import { auditResume, createResumeRecord } from "@/lib/careerpath/agents";
import { tailorResumeAgent } from "@/lib/careerpath/orchestrator";
import { getServerResume, saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";

const TailorRequestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resume: ResumePayloadSchema.optional(),
  jobDescription: z.string().trim().min(1).max(15_000),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 100_000, TailorRequestSchema);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "Invalid payload or job description too long.", recoverable: true } },
        { status: parsedBody.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const body = parsedBody.data as { resumeId?: string; resume?: CareerPathResume; jobDescription: string };

    if (isServerSupabaseConfigured && !body.resumeId) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "resumeId is required.", recoverable: true } }, { status: 400 });
    }

    const resume = isServerSupabaseConfigured
      ? await getServerResume(body.resumeId!, auth.user.id)
      : body.resume ?? (body.resumeId ? await getServerResume(body.resumeId, auth.user.id) : null);
    if (!resume) {
      return NextResponse.json({ error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } }, { status: 404 });
    }

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(
      auth.user.id,
      ipHash,
      entitlements.aiActionsPerDay,
      "resume_tailor",
      entitlements.tailoringPerDay,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Daily AI or tailoring limit exceeded.", recoverable: true } }, { status: 429 });
    }

    const tailoring = await tailorResumeAgent(
      resume.content,
      resume.targetRole,
      body.jobDescription,
      { userId: auth.user.id, resumeId: resume.id },
    );
    const tailoredContent = tailoring.tailoredResume;
    const audit = auditResume(tailoredContent, resume.targetRole, body.jobDescription);
    const tailored = createResumeRecord({
      userId: auth.user.id,
      mode: "tailor",
      targetRole: resume.targetRole,
      content: tailoredContent,
      profile: resume.profile,
      jobDescription: body.jobDescription,
      version: resume.version + 1,
      title: `${resume.targetRole} Tailored Resume`,
    });
    tailored.careerProfile = resume.careerProfile;
    tailored.tailoring = tailoring;
    tailored.audit = audit;
    tailored.score = audit.score;
    await saveServerResume(tailored, auth.user.id);

    return NextResponse.json({
      newResumeId: tailored.id,
      matchScore: tailoring.matchScore,
      matchedKeywords: tailoring.matchedKeywords,
      missingKeywords: tailoring.missingKeywordsNotAdded,
      tailoredContent,
      tailoring,
      resume: tailored,
    });
  } catch (err) {
    logger.error("[api/resume/tailor] Error", { error: err });
    return NextResponse.json(
      { error: { code: "TAILOR_FAILED", message: "Unable to tailor resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
