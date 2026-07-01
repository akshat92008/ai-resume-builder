import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { auditResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume, deleteServerResume } from "@/lib/careerpath/db";
import type { CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";
import { ResumePayloadSchema, mergeResumeContent } from "@/lib/careerpath/types";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { parseJsonBody } from "@/lib/careerpath/api-utils";
import { z } from "zod";

const IdSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID.", recoverable: true } }, { status: 400 });
    }
    const resume = await getServerResume(id);
    if (!resume || resume.userId !== auth.user.id) {
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
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID.", recoverable: true } }, { status: 400 });
    }
    const resume = await getServerResume(id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const text = await request.text().catch(() => "{}");
    if (text.length > 100000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = parseJsonBody(text);
    if ("error" in json && json.error === "INVALID_JSON") {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Invalid JSON body.", recoverable: false } },
        { status: 400 }
      );
    }
    const parseResult = ResumePayloadSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid payload.", recoverable: true } }, { status: 400 });
    }
    const body = parseResult.data;

    const updated: CareerPathResume = {
      ...resume,
      ...body,
      id: resume.id,
      content: body.content ? mergeResumeContent(resume.content, body.content as Partial<CareerPathResumeContent>) : resume.content,
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
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID.", recoverable: true } }, { status: 400 });
    }
    const resume = await getServerResume(id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
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
