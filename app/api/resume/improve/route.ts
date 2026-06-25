import { NextResponse } from "next/server";
import { auditResumeAgent, improveResumeAgent } from "@/lib/careerpath/orchestrator";
import { getServerResume, saveServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    resumeId?: string;
    resume?: CareerPathResume;
  };
  const resume = body.resume ?? (body.resumeId ? await getServerResume(body.resumeId) : null);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const startingAudit = resume.audit ?? await auditResumeAgent(resume.content, resume.targetRole, resume.jobDescription);
  const content = await improveResumeAgent(resume.content, startingAudit, resume.targetRole);
  const audit = await auditResumeAgent(content, resume.targetRole, resume.jobDescription);
  const updated: CareerPathResume = {
    ...resume,
    content,
    audit,
    score: audit.score,
    status: "final",
    updatedAt: new Date().toISOString(),
  };
  await saveServerResume(updated);

  return NextResponse.json({ resumeId: updated.id, content, score: audit.score, audit, resume: updated });
}
