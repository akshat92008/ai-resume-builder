import { NextResponse } from "next/server";

export const maxDuration = 60;
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
import { handleResumeMessage } from "@/lib/resume/agent";
import { deriveRenderableResume } from "@/lib/resume/render";
import { contentToResumeState } from "@/lib/resume/types";
import { auditResume } from "@/lib/careerpath/agents";

const ImproveRequestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resume: ResumePayloadSchema.optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 100_000, ImproveRequestSchema);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "Invalid improve payload.", recoverable: true } },
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

    const state = contentToResumeState(resume.content, { id: resume.id, targetRole: resume.targetRole });
    const brain = await handleResumeMessage({
      userMessage: "Make it ATS friendly and improve bullets without adding unsupported facts.",
      currentResume: state,
    });
    const content = deriveRenderableResume(brain.resume || state);
    const audit = auditResume(content, resume.targetRole, resume.jobDescription);
    const updated: CareerPathResume = {
      ...resume,
      userId: auth.user.id,
      content,
      audit,
      score: audit.score,
      status: "final",
      updatedAt: new Date().toISOString(),
    };
    await saveServerResume(updated, auth.user.id);

    return NextResponse.json({ resumeId: updated.id, content, score: audit.score, audit, resume: updated });
  } catch (err) {
    logger.error("[api/resume/improve] Error", { error: err });
    return NextResponse.json(
      { error: { code: "IMPROVE_FAILED", message: "Unable to improve resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
