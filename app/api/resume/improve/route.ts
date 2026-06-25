import { NextResponse } from "next/server";
import { auditResume, improveResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume } from "@/lib/careerpath/server-store";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    resumeId?: string;
    resume?: CareerPathResume;
  };
  const resume = body.resume ?? (body.resumeId ? getServerResume(body.resumeId) : null);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const startingAudit = resume.audit ?? auditResume(resume.content, resume.targetRole, resume.jobDescription);
  const content = improveResume(resume.content, startingAudit, resume.targetRole);
  const audit = auditResume(content, resume.targetRole, resume.jobDescription);
  const updated: CareerPathResume = {
    ...resume,
    content,
    audit,
    score: audit.score,
    status: "final",
    updatedAt: new Date().toISOString(),
  };
  saveServerResume(updated);

  return NextResponse.json({ resumeId: updated.id, content, score: audit.score, audit, resume: updated });
}
