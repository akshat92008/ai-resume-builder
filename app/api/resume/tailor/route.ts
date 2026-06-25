import { NextResponse } from "next/server";
import { auditResumeAgent, tailorResumeAgent } from "@/lib/careerpath/orchestrator";
import { createResumeRecord } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      resumeId?: string;
      resume?: CareerPathResume;
      jobDescription?: string;
    };
    const resume = body.resume ?? (body.resumeId ? await getServerResume(body.resumeId) : null);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    if (!body.jobDescription?.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Job description is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const tailoring = await tailorResumeAgent(resume.content, resume.targetRole, body.jobDescription);
    const audit = await auditResumeAgent(tailoring.tailoredResume, resume.targetRole, body.jobDescription);
    const tailored = createResumeRecord({
      mode: "tailor",
      targetRole: resume.targetRole,
      content: tailoring.tailoredResume,
      profile: resume.profile,
      jobDescription: body.jobDescription,
      version: resume.version + 1,
      title: `${resume.targetRole} Tailored Resume`,
    });
    tailored.tailoring = tailoring;
    tailored.audit = audit;
    tailored.score = audit.score;
    await saveServerResume(tailored);

    return NextResponse.json({
      newResumeId: tailored.id,
      matchScore: tailoring.matchScore,
      matchedKeywords: tailoring.matchedKeywords,
      missingKeywords: tailoring.missingKeywordsNotAdded,
      tailoredContent: tailoring.tailoredResume,
      tailoring,
      resume: tailored,
    });
  } catch (err) {
    console.error("[api/resume/tailor] Error:", err);
    return NextResponse.json(
      { error: { code: "TAILOR_FAILED", message: "Unable to tailor resume. Try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
