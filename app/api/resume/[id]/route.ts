import { NextResponse } from "next/server";

export const maxDuration = 60;
import { auditResume } from "@/lib/careerpath/agents";
import { getServerResume, saveServerResume, deleteServerResume, ResumeConflictError, saveResumeVersion } from "@/lib/careerpath/db";
import type { CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";
import { ResumePayloadSchema, mergeResumeContent } from "@/lib/careerpath/types";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { parseJsonBody } from "@/lib/careerpath/api-utils";
import { logger } from "@/lib/observability/logger";
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
    const resume = await getServerResume(id, auth.user.id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    return NextResponse.json({ resume });
  } catch (error: unknown) {
    logger.error("[api/resume/[id]] GET failed", { error });
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
    const resume = await getServerResume(id, auth.user.id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const text = await request.text().catch(() => "{}");
    if (Buffer.byteLength(text, "utf8") > 100_000) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large.", recoverable: true } }, { status: 413 });
    }
    const json = parseJsonBody(text);
    if ("error" in json && json.error === "INVALID_JSON") {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Invalid JSON body.", recoverable: false } },
        { status: 400 },
      );
    }
    const parseResult = ResumePayloadSchema.strict().safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid payload.", recoverable: true } }, { status: 400 });
    }
    const body = parseResult.data;

    await saveResumeVersion({
      userId: auth.user.id,
      resumeId: resume.id,
      versionName: `Before manual edit v${resume.version}`,
      resumeJson: resume.content,
      reason: "Pre-edit snapshot",
    });

    const updated: CareerPathResume = {
      ...resume,
      ...body,
      id: resume.id,
      userId: resume.userId,
      content: body.content ? mergeResumeContent(resume.content, body.content as Partial<CareerPathResumeContent>) : resume.content,
      version: resume.version + 1,
      updatedAt: new Date().toISOString(),
    };
    const audit = auditResume(updated.content, updated.targetRole, updated.jobDescription);
    updated.audit = audit;
    updated.score = audit.score;
    await saveServerResume(updated, auth.user.id, { expectedVersion: resume.version });

    return NextResponse.json({ resume: updated });
  } catch (error: unknown) {
    if (error instanceof ResumeConflictError) {
      return NextResponse.json(
        { error: { code: "RESUME_CONFLICT", message: "This resume changed while your edit was being saved. Reload and retry.", recoverable: true } },
        { status: 409 },
      );
    }
    logger.error("[api/resume/[id]] PATCH failed", { error });
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
    const resume = await getServerResume(id, auth.user.id);
    if (!resume || resume.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "RESUME_NOT_FOUND", message: "Resume not found.", recoverable: true } },
        { status: 404 },
      );
    }
    await deleteServerResume(id, auth.user.id);
    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    logger.error("[api/resume/[id]] DELETE failed", { error });
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "Unable to delete resume.", recoverable: true } },
      { status: 500 },
    );
  }
}
