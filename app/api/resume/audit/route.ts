import { NextResponse } from "next/server";
import { auditResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume } from "@/lib/careerpath/server-store";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    resumeId?: string;
    resume?: CareerPathResume;
  };
  const resume = body.resume ?? (body.resumeId ? getServerResume(body.resumeId) : null);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const audit = auditResume(resume.content, resume.targetRole, resume.jobDescription);
  const updated = { ...resume, audit, score: audit.score, updatedAt: new Date().toISOString() };
  saveServerResume(updated);

  return NextResponse.json({ score: audit.score, audit, resume: updated });
}
