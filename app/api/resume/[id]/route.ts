import { NextResponse } from "next/server";
import { auditResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume, deleteServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resume = await getServerResume(id);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    return NextResponse.json({ resume });
  } catch (err) {
    console.error("[api/resume/[id]] GET Error:", err);
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: "Unable to load resume.", recoverable: true } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const resume = await getServerResume(id);
    if (!resume) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

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
    await saveServerResume(updated);

    return NextResponse.json({ resume: updated });
  } catch (err) {
    console.error("[api/resume/[id]] PATCH Error:", err);
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: "Unable to update resume.", recoverable: true } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteServerResume(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[api/resume/[id]] DELETE Error:", err);
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "Unable to delete resume.", recoverable: true } },
      { status: 500 },
    );
  }
}
