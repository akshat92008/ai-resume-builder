import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { generateOutreachAgent } from "@/lib/careerpath/orchestrator";
import { getJobApplication } from "@/lib/careerpath/db-jobs";
import { getServerResume } from "@/lib/careerpath/db";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import type { CareerProfile } from "@/lib/careerpath/types";

export const maxDuration = 60;

const MAX_BODY_BYTES = 60_000;
const OutreachRequestSchema = z.object({
  jobId: z.string().uuid().optional(),
  resumeId: z.string().uuid(),
  jobDescription: z.string().trim().min(1).max(50_000),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const parsed = await readJsonLimited(request, MAX_BODY_BYTES, OutreachRequestSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: parsed.code === "PAYLOAD_TOO_LARGE" ? "Outreach requests must be 60 KB or smaller." : "Provide a valid resume, optional job, and job description." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }

    const { jobId, resumeId, jobDescription } = parsed.data;
    const resume = await getServerResume(resumeId, auth.user.id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Resume not found." } }, { status: 404 });
    }

    const profile: CareerProfile = resume.careerProfile || legacyProfileToCareerProfile(resume.profile, auth.user.id);
    const content = typeof resume.content === "string" ? JSON.parse(resume.content) : resume.content;

    let company = "the company";
    let role = resume.targetRole || "the position";
    if (jobId) {
      const job = await getJobApplication(jobId, auth.user.id);
      if (!job || job.userId !== auth.user.id) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
      }
      company = job.company;
      role = job.role;
    }

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(
      auth.user.id,
      ipHash,
      entitlements.aiActionsPerDay,
      "outreach_generate",
      entitlements.outreachPerDay,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Daily AI or outreach usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const outreachPack = await generateOutreachAgent(
      profile,
      content,
      jobDescription,
      role,
      { userId: auth.user.id, resumeId },
    );

    return NextResponse.json({ outreachPack, company, role });
  } catch (error: unknown) {
    logger.error("[api/outreach] Error generating outreach pack", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate outreach materials." } },
      { status: 500 },
    );
  }
}
