import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState, extractJobDescription } from "@/lib/careerpath/career-os";
import { getLatestResumeForUser, getServerResume } from "@/lib/careerpath/db";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { analyzeCareerLoopJob, buildCareerEvidenceGraph, extractJobTextFromUrl, inferJobSource } from "@/lib/careerloop";

const InputSchema = z.object({
  jobUrl: z.string().trim().max(2048).optional(),
  jobDescription: z.string().trim().max(50_000).optional(),
  resumeId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.jobUrl || value.jobDescription), {
  message: "Provide a job URL or job description.",
});

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user.id, ipHash, "job_analyzer", 15);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many job analyses. Please try again later.", recoverable: true } },
        { status: 429 },
      );
    }

    const parsed = InputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide a valid job URL or job-description text." } },
        { status: 400 },
      );
    }

    const resume = parsed.data.resumeId
      ? await getServerResume(parsed.data.resumeId, auth.user.id)
      : await getLatestResumeForUser(auth.user.id);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "CAREER_MEMORY_REQUIRED", message: "Build Career Memory or create a resume before running Apply/Skip analysis." } },
        { status: 409 },
      );
    }

    let jobText = parsed.data.jobDescription?.trim() || "";
    let finalUrl = parsed.data.jobUrl?.trim() || "";
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
