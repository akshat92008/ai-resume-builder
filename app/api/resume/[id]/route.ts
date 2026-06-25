import { NextResponse } from "next/server";
import { auditResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume } from "@/lib/careerpath/server-store";
import type { CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resume = getServerResume(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  return NextResponse.json({ resume });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resume = getServerResume(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Partial<CareerPathResume> & {
    content?: CareerPathResumeContent;
  };
  const updated: CareerPathResume = {
    ...resume,
    ...body,
    id: resume.id,
    content: body.content ?? resume.content,
    updatedAt: new Date().toISOString(),
  };
  const audit = auditResume(updated.content, updated.targetRole, updated.jobDescription);
  updated.audit = audit;
  updated.score = audit.score;
  saveServerResume(updated);

  return NextResponse.json({ resume: updated });
}
