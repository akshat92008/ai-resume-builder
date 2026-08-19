import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState, extractJobDescription } from "@/lib/careerpath/career-os";
import { getLatestResumeForUser, getServerResume } from "@/lib/careerpath/db";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { analyzeCareerLoopJob, buildCareerEvidenceGraph, extractJobTextFromUrl, inferJobSource } from "@/lib/careerloop";

const InputSchema = z.object({
  jobUrl: z.string().trim().url().max(2048).refine((value) => value.startsWith("https://"), "Job URL must use HTTPS.").optional(),
  jobDescription: z.string().trim().max(50_000).optional(),
  resumeId: z.string().uuid().optional(),
}).strict().refine((value) => Boolean(value.jobUrl || value.jobDescription), {
  message: "Provide a job URL or job description.",
});

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 60_000, InputSchema);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "Provide a valid job URL or job-description text." } },
        { status: parsedBody.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const parsed = parsedBody.data;

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(auth.user.id, ipHash, entitlements.aiActionsPerDay);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Daily AI usage limit reached. Please try again after the quota resets.", recoverable: true } },
        { status: 429 },
      );
    }

    const resume = parsed.resumeId
      ? await getServerResume(parsed.resumeId, auth.user.id)
      : await getLatestResumeForUser(auth.user.id);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "CAREER_MEMORY_REQUIRED", message: "Build Career Memory or create a resume before running Apply/Skip analysis." } },
        { status: 409 },
      );
    }

    let jobText = parsed.jobDescription?.trim() || "";
    let finalUrl = parsed.jobUrl?.trim() || "";
    let extractedFromUrl = false;
    if (jobText.length < 120 && finalUrl) {
      try {
        const extracted = await extractJobTextFromUrl(finalUrl);
        jobText = extracted.text;
        finalUrl = extracted.finalUrl;
        extractedFromUrl = true;
      } catch (error) {
        return NextResponse.json(
          {
            error: {
              code: "URL_EXTRACTION_FAILED",
              message: error instanceof Error ? error.message : "Could not read this job URL. Paste the job description instead.",
              recoverable: true,
            },
          },
          { status: 422 },
        );
      }
    }
    if (jobText.length < 120) {
      return NextResponse.json(
        { error: { code: "JOB_DESCRIPTION_TOO_SHORT", message: "Paste more of the job description so CareerLoop can make an evidence-backed decision." } },
        { status: 400 },
      );
    }

    const workspace = buildCareerWorkspaceState(resume);
    const profile = workspace.careerProfile;
    if (!profile) {
      return NextResponse.json(
        { error: { code: "CAREER_MEMORY_REQUIRED", message: "Career Memory is incomplete. Add your experience, skills, and projects first." } },
        { status: 409 },
      );
    }

    const job = extractJobDescription(jobText);
    const report = analyzeCareerLoopJob(job, profile);
    const graph = buildCareerEvidenceGraph(profile);
    const source = inferJobSource(finalUrl);

    return NextResponse.json({
      report,
      resume: { id: resume.id, title: resume.title, version: resume.version },
      careerTwin: graph.stats,
      source,
      jobUrl: finalUrl || undefined,
      extractedFromUrl,
    });
  } catch (error) {
    logger.error("[api/job-analyzer] Failed", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Job analysis failed. Please try again." } },
      { status: 500 },
    );
  }
}
