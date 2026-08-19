import { NextResponse } from "next/server";

export const maxDuration = 60;
import { auditResumeAgent } from "@/lib/careerpath/orchestrator";
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

const AuditRequestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resume: ResumePayloadSchema.optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 100_000, AuditRequestSchema);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "Invalid audit payload.", recoverable: true } },
        { status: parsedBody.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const body = parsedBody.data as { resumeId?: string; resume?: CareerPathResume };

    if (isServerSupabaseConfigured && !body.resumeId) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "resumeId is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(auth.user.id, ipHash, entitlements.aiActionsPerDay);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const resume = isServerSupabaseConfigured
      ? await getServerResume(body.resumeId!, auth.user.id)
      : body.resume ?? (body.resumeId ? await getServerResume(body.resumeId, auth.user.id) : null);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const metadata = { userId: auth.user.id, resumeId: resume.id };
    const audit = await auditResumeAgent(resume.content, resume.targetRole, resume.jobDescription, metadata);
    const updated = { ...resume, audit, score: audit.score, updatedAt: new Date().toISOString() };
    await saveServerResume(updated as CareerPathResume, auth.user.id);

    return NextResponse.json({ score: audit.score, audit, resume: updated });
  } catch (err) {
    logger.error("[api/resume/audit] Error", { error: err });
    return NextResponse.json(
      { error: { code: "AUDIT_FAILED", message: "Unable to audit resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
