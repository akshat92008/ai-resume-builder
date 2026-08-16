import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getJobApplication, saveJobApplication, deleteJobApplication } from "@/lib/careerpath/db-jobs";
import { logger } from "@/lib/observability/logger";
import { UpdateJobApplicationSchema } from "@/lib/careerpath/job-validation";
import type { JobApplication } from "@/lib/careerpath/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
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
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load job" } },
      { status: 500 }
    );
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

    const json = await request.json().catch(() => ({}));
    const parsed = UpdateJobApplicationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "One or more job fields are invalid." } },
        { status: 400 },
      );
    }
    const updates = Object.fromEntries(
      Object.entries(parsed.data).map(([key, value]) => [key, value ?? undefined]),
    ) as Partial<JobApplication>;

    // Create updated job object, merging only validated editable fields.
    const updatedJob: JobApplication = {
      ...job,
      ...updates,
      id: job.id, // Prevent ID tampering
      userId: job.userId, // Prevent user tampering
      updatedAt: new Date().toISOString(),
    };

    // Auto-set appliedAt if status changes to applied
    if (updates.status === "applied" && !job.appliedAt) {
      updatedJob.appliedAt = updatedJob.updatedAt;
    }

    await saveJobApplication(updatedJob, auth.user.id);
    return NextResponse.json({ job: updatedJob });
  } catch (error: unknown) {
    logger.error("[api/jobs/[id]] PATCH error", { error, jobId: id });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update job" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
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
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete job" } },
      { status: 500 }
    );
  }
}
