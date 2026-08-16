import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { createId } from "@/lib/careerpath/domain/utils";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import type { JobApplication } from "@/lib/careerpath/types";
import { CreateJobApplicationSchema } from "@/lib/careerpath/job-validation";

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const jobs = await listJobApplications(auth.user.id);
    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    logger.error("[api/jobs] Error listing jobs", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load jobs" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "jobs_create", 20);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", recoverable: true } },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = CreateJobApplicationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide a valid company, role, and job details." } },
        { status: 400 },
      );
    }
    const { company, role, jobUrl, notes, status } = parsed.data;

    const now = new Date().toISOString();
    const newJob: JobApplication = {
      id: createId(),
      userId: auth.user.id,
      company,
      role,
      jobUrl,
      status,
      notes,
      appliedAt: status === "applied" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await saveJobApplication(newJob, auth.user.id);
    return NextResponse.json({ job: newJob });
  } catch (error: unknown) {
    logger.error("[api/jobs] Error creating job", { error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save job" } },
      { status: 500 }
    );
  }
}
