import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { createId } from "@/lib/careerpath/domain/utils";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import type { CareerLoopJobApplication } from "@/lib/careerloop/types";
import { inferJobSource } from "@/lib/careerloop/conversion";
import { CreateJobApplicationSchema } from "@/lib/careerpath/job-validation";

export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    return NextResponse.json({ jobs: await listJobApplications(auth.user.id) });
  } catch (error: unknown) {
    logger.error("[api/jobs] Error listing jobs", { error });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load jobs" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "jobs_create", 20);
    if (!rateLimit.allowed) return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", recoverable: true } }, { status: 429 });

    const parsed = CreateJobApplicationSchema.safeParse(await request.json().catch(() => ({})));
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
    return NextResponse.json({ job: newJob });
  } catch (error: unknown) {
    logger.error("[api/jobs] Error creating job", { error });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to save job" } }, { status: 500 });
  }
}
