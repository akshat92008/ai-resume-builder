import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { generateOutreachAgent } from "@/lib/careerpath/orchestrator";
import { getJobApplication } from "@/lib/careerpath/db-jobs";
import { getServerResume } from "@/lib/careerpath/db";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import type { CareerProfile } from "@/lib/careerpath/types";

export const maxDuration = 60; // Allow more time for AI generation

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const json = await request.json();
    const { jobId, resumeId, jobDescription } = json;

    if (!jobDescription) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Job description is required." } },
        { status: 400 }
      );
    }

    // 1. Get the resume content and profile
    if (!resumeId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Resume ID is required." } },
        { status: 400 }
      );
    }

    const resume = await getServerResume(resumeId);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Resume not found." } },
        { status: 404 }
      );
    }

    const profile: CareerProfile = resume.careerProfile || legacyProfileToCareerProfile(resume.profile, auth.user.id);
    const content = typeof resume.content === "string" ? JSON.parse(resume.content) : resume.content;

    // 2. Extract company and role from job tracker if available
    let company = "the company";
    let role = resume.targetRole || "the position";
    
    if (jobId) {
      const job = await getJobApplication(jobId);
      if (job && job.userId === auth.user.id) {
        company = job.company;
        role = job.role;
      }
    }

    // 3. Generate the Outreach Pack
    const outreachPack = await generateOutreachAgent(
      profile,
      content,
      jobDescription,
      role,
      { userId: auth.user.id, resumeId }
    );

    return NextResponse.json({ outreachPack });
  } catch (error: any) {
    console.error("[api/outreach] Error generating outreach pack:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to generate outreach materials" } },
      { status: 500 }
    );
  }
}
