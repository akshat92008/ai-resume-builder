import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { createId } from "@/lib/careerpath/domain/utils";
import type { JobApplication } from "@/lib/careerpath/types";

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const jobs = await listJobApplications(auth.user.id);
    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("[api/jobs] Error listing jobs:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to load jobs" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const json = await request.json();
    const { company, role, jobUrl, notes, status = "saved" } = json;

    if (!company || !role) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Company and role are required." } },
        { status: 400 }
      );
    }

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

    await saveJobApplication(newJob);
    return NextResponse.json({ job: newJob });
  } catch (error: any) {
    console.error("[api/jobs] Error creating job:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to save job" } },
      { status: 500 }
    );
  }
}
