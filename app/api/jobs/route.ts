import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { DatabaseUnavailableError, listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { createId } from "@/lib/careerpath/domain/utils";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited, RequestBodyError } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import type { CareerLoopJobApplication } from "@/lib/careerloop/types";
import { inferJobSource } from "@/lib/careerloop/conversion";
import { CreateJobApplicationSchema } from "@/lib/careerpath/job-validation";

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
    const jobs = await listJobApplications(auth.user.id, { limit, offset });
    return NextResponse.json({ jobs, pagination: { limit, offset, hasMore: jobs.length === limit } });
  } catch (error: unknown) {
    logger.error("[api/jobs] Error listing jobs", { error });
    const unavailable = error instanceof DatabaseUnavailableError;
    return NextResponse.json(
      { error: { code: unavailable ? "DATABASE_UNAVAILABLE" : "INTERNAL_ERROR", message: unavailable ? "Jobs are temporarily unavailable. Please retry." : "Failed to load jobs", recoverable: true } },
      { status: unavailable ? 503 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "jobs_create", 20);
    if (!rateLimit.allowed) return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", recoverable: true } }, { status: 429 });

    const parsed = CreateJobApplicationSchema.safeParse(await readJsonLimited(request, 25_000));
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid company, role, and job details." } }, { status: 400 });

    const now = new Date().toISOString();
    const input = parsed.data;
    const newJob: CareerLoopJobApplication = {
      id: createId(), userId: auth.user.id, company: input.company, role: input.role,
      jobUrl: input.jobUrl || undefined, resumeId: input.resumeId, resumeVersion: input.resumeVersion,
      source: input.source || inferJobSource(input.jobUrl), fitScore: input.fitScore, fitRecommendation: input.fitRecommendation,
      status: input.status, notes: input.notes, appliedAt: input.status === "applied" ? now : undefined, createdAt: now, updatedAt: now,
    };
    await saveJobApplication(newJob, auth.user.id);
    return NextResponse.json({ job: newJob }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: { code: error.code, message: error.message, recoverable: true } }, { status: error.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 });
    }
    logger.error("[api/jobs] Error creating job", { error });
    const unavailable = error instanceof DatabaseUnavailableError;
    return NextResponse.json(
      { error: { code: unavailable ? "DATABASE_UNAVAILABLE" : "INTERNAL_ERROR", message: unavailable ? "Jobs are temporarily unavailable. Please retry." : "Failed to save job", recoverable: true } },
      { status: unavailable ? 503 : 500 },
    );
  }
}
