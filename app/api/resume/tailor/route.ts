import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { auditResume, createResumeRecord } from "@/lib/careerpath/agents";
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

const TailorRequestSchema = z.object({
  resumeId: z.string().optional(),
  resume: ResumePayloadSchema.optional(),
  jobDescription: z.string().max(15000).optional(),
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

    const state = contentToResumeState(resume.content, { id: resume.id, targetRole: resume.targetRole });
    const brain = await handleResumeMessage({
      userMessage: body.jobDescription,
      currentResume: state,
    });
    const tailoredContent = deriveRenderableResume(brain.resume || state);
    const audit = auditResume(tailoredContent, resume.targetRole, body.jobDescription);
    const tailored = createResumeRecord({
      mode: "tailor",
      targetRole: resume.targetRole,
      content: tailoredContent,
      profile: resume.profile,
      jobDescription: body.jobDescription,
      version: resume.version + 1,
      title: `${resume.targetRole} Tailored Resume`,
    });
    tailored.tailoring = {
      matchScore: audit.score.roleAlignment,
      matchedKeywords: brain.matchedKeywords || [],
      safeKeywordsAdded: [],
      missingKeywordsNotAdded: brain.missingKeywords || [],
      tailoringSummary: ["Reordered supported facts toward the job description without adding missing skills."],
      tailoredResume: tailoredContent,
    };
    tailored.audit = audit;
    tailored.score = audit.score;
    await saveServerResume(tailored);

    return NextResponse.json({
      newResumeId: tailored.id,
      matchScore: tailored.tailoring.matchScore,
      matchedKeywords: tailored.tailoring.matchedKeywords,
      missingKeywords: tailored.tailoring.missingKeywordsNotAdded,
      tailoredContent,
      tailoring: tailored.tailoring,
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
