import { NextResponse } from "next/server";

export const maxDuration = 60;
import { auditResume, createResumeRecord } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { ResumePayloadSchema } from "@/lib/careerpath/types";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/careerpath/api-utils";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";
import { handleResumeMessage } from "@/lib/resume/agent";
import { deriveRenderableResume } from "@/lib/resume/render";
import { contentToResumeState } from "@/lib/resume/types";

const TailorRequestSchema = z.object({
  resumeId: z.string().uuid().optional(),
  resume: ResumePayloadSchema.optional(),
  jobDescription: z.string().trim().min(1).max(15000),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const text = await request.text().catch(() => "{}");
    if (new TextEncoder().encode(text).byteLength > 100000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = parseJsonBody(text);
    if ("error" in json && json.error === "INVALID_JSON") {
      return NextResponse.json({ error: { code: "INVALID_JSON", message: "Invalid JSON body.", recoverable: false } }, { status: 400 });
    }
    const parseResult = TailorRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid payload or job description too long.", recoverable: true } }, { status: 400 });
    }
    const body = parseResult.data as { resumeId?: string; resume?: CareerPathResume; jobDescription: string };

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

    const state = contentToResumeState(resume.content, { id: resume.id, targetRole: resume.targetRole });
    const brain = await handleResumeMessage({ userMessage: body.jobDescription, currentResume: state });
    const tailoredContent = deriveRenderableResume(brain.resume || state);
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
    tailored.tailoring = {
      matchScore: audit.score.roleAlignment,
      matchedKeywords: brain.matchedKeywords || [],
      safeKeywordsAdded: [],
      missingKeywordsNotAdded: brain.missingKeywords || [],
      tailoringSummary: ["Rewrote and reordered supported facts toward the job description without adding missing skills."],
      tailoredResume: tailoredContent,
    };
    tailored.audit = audit;
    tailored.score = audit.score;
    await saveServerResume(tailored, auth.user.id);

    return NextResponse.json({ newResumeId: tailored.id, matchScore: tailored.tailoring.matchScore, matchedKeywords: tailored.tailoring.matchedKeywords, missingKeywords: tailored.tailoring.missingKeywordsNotAdded, tailoredContent, tailoring: tailored.tailoring, resume: tailored });
  } catch (err) {
    logger.error("[api/resume/tailor] Error", { error: err });
    return NextResponse.json(
      { error: { code: "TAILOR_FAILED", message: "Unable to tailor resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
