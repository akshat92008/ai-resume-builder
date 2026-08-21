import { NextResponse } from "next/server";

export const maxDuration = 60;
import { createResumeRecord } from "@/lib/careerpath/agents";
import { tailorResumeAgent } from "@/lib/careerpath/orchestrator";
import { getServerResume, saveResumeVersion, saveServerResume } from "@/lib/careerpath/db";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { fallbackTailorResume } from "@/lib/careerpath/runtime-fallbacks";
import { normalizeResumeContent } from "@/lib/careerpath/resume-content-normalization";
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
    resume.content = normalizeResumeContent(resume.content);

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

    let tailoring;
    try {
      tailoring = await tailorResumeAgent(
        resume.content,
        resume.targetRole,
        body.jobDescription,
        { userId: auth.user.id, resumeId: resume.id },
      );
    } catch {
      tailoring = fallbackTailorResume(resume.content, body.jobDescription);
    }

    const verified = await verifyResumeCandidate({
      content: tailoring.tailoredResume,
      currentResume: resume,
      userId: auth.user.id,
      legacyProfile: resume.profile,
      careerProfile: resume.careerProfile,
      instruction: body.jobDescription,
      mode: "tailor",
      targetRole: resume.targetRole,
      jobDescription: body.jobDescription,
      metadata: { userId: auth.user.id, resumeId: resume.id },
    });

    await saveResumeVersion({
      userId: auth.user.id,
      resumeId: resume.id,
      versionName: `Before tailoring v${resume.version}`,
      resumeJson: resume.content,
      reason: "Pre-tailoring snapshot",
    });

    const tailored = createResumeRecord({
      userId: auth.user.id,
      mode: "tailor",
      targetRole: resume.targetRole,
      content: verified.content,
      profile: resume.profile,
      jobDescription: body.jobDescription,
      version: resume.version + 1,
      title: `${resume.targetRole} Tailored Resume`,
      audit: verified.audit,
    });
    tailored.careerProfile = verified.careerProfile;
    tailored.tailoring = {
      ...tailoring,
      tailoredResume: verified.content,
    };
    tailored.audit = verified.audit;
    tailored.score = verified.score;
    await saveServerResume(tailored, auth.user.id);

    return NextResponse.json({
      newResumeId: tailored.id,
      matchScore: tailoring.matchScore,
      matchedKeywords: tailoring.matchedKeywords,
      missingKeywords: tailoring.missingKeywordsNotAdded,
      tailoredContent: verified.content,
      tailoring: tailored.tailoring,
      verification: {
        removedUnsupportedClaims: verified.provenance.removedClaims,
        warnings: verified.validation.warnings.length,
      },
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
