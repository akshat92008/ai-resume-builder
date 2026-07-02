import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getJobApplication, saveJobApplication, deleteJobApplication } from "@/lib/careerpath/db-jobs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(params.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error(`[api/jobs/${params.id}] GET error:`, error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to load job" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(params.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    const updates = await request.json();
    
    // Create updated job object, merging new fields
    const updatedJob = {
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

    await saveJobApplication(updatedJob);
    return NextResponse.json({ job: updatedJob });
  } catch (error: any) {
    console.error(`[api/jobs/${params.id}] PATCH error:`, error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to update job" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const job = await getJobApplication(params.id);
    if (!job || job.userId !== auth.user.id) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
    }

    await deleteJobApplication(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[api/jobs/${params.id}] DELETE error:`, error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to delete job" } },
      { status: 500 }
    );
  }
}
