import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { DatabaseUnavailableError, getJobApplication, saveJobApplication, deleteJobApplication } from "@/lib/careerpath/db-jobs";
import { logger } from "@/lib/observability/logger";
import { UpdateJobApplicationSchema } from "@/lib/careerpath/job-validation";
import { readJsonLimited } from "@/lib/http/request";
import type { JobApplication } from "@/lib/careerpath/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function failure(error: unknown, message: string) {
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "CareerOS data is temporarily unavailable. Please retry." } },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(id, auth.user.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    logger.error("[api/jobs/[id]] GET error", { error, jobId: id });
    return failure(error, "Failed to load job");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(id, auth.user.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    const parsed = await readJsonLimited(request, 25_000, UpdateJobApplicationSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: "One or more job fields are invalid." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const updates = Object.fromEntries(
      Object.entries(parsed.data).map(([key, value]) => [key, value ?? undefined]),
    ) as Partial<JobApplication>;

    const updatedJob: JobApplication = {
      ...job,
      ...updates,
      id: job.id,
      userId: job.userId,
      updatedAt: new Date().toISOString(),
    };

    if (updates.status === "applied" && !job.appliedAt) updatedJob.appliedAt = updatedJob.updatedAt;

    await saveJobApplication(updatedJob, auth.user.id);
    return NextResponse.json({ job: updatedJob });
  } catch (error: unknown) {
    logger.error("[api/jobs/[id]] PATCH error", { error, jobId: id });
    return failure(error, "Failed to update job");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(id, auth.user.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    await deleteJobApplication(id, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("[api/jobs/[id]] DELETE error", { error, jobId: id });
    return failure(error, "Failed to delete job");
  }
}
