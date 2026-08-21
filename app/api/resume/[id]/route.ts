import { NextResponse } from "next/server";

export const maxDuration = 60;
import { auditResume } from "@/lib/careerpath/agents";
import {
  DatabaseUnavailableError,
  getServerResume,
  saveServerResume,
  deleteServerResume,
  ResumeConflictError,
  saveResumeVersion,
} from "@/lib/careerpath/db";
import type { CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";
import { ResumePayloadSchema, mergeResumeContent } from "@/lib/careerpath/types";
import { normalizeResumeContent } from "@/lib/careerpath/resume-content-normalization";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";

const IdSchema = z.string().uuid();
const EditResumeSchema = ResumePayloadSchema.extend({
  expectedVersion: z.number().int().nonnegative(),
}).strict();

function databaseFailure(error: unknown, fallbackCode: string, fallbackMessage: string) {
  const unavailable = error instanceof DatabaseUnavailableError;
  return NextResponse.json(
    {
      error: {
        code: unavailable ? "DATABASE_UNAVAILABLE" : fallbackCode,
        message: unavailable ? "Resume data is temporarily unavailable. Please retry." : fallbackMessage,
        recoverable: true,
      },
    },
    { status: unavailable ? 503 : 500 },
  );
}

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
    resume.content = normalizeResumeContent(resume.content);
    return NextResponse.json({ resume });
  } catch (error: unknown) {
    logger.error("[api/resume/[id]] GET failed", { error });
    return databaseFailure(error, "FETCH_FAILED", "Unable to load resume.");
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

    // Database JSON may predate the current complete content shape. Normalize
    // before snapshot/merge so a valid manual edit can never reach downstream
    // auditing with missing arrays or nested header links.
    resume.content = normalizeResumeContent(resume.content);

    const parsed = await readJsonLimited(request, 100_000, EditResumeSchema);
    if (!parsed.ok) {
      const publicCode = parsed.code === "VALIDATION_ERROR" ? "INVALID_INPUT" : parsed.code;
      return NextResponse.json(
        {
          error: {
            code: publicCode,
            message: parsed.code === "PAYLOAD_TOO_LARGE" ? "Payload too large." : "Invalid resume update payload.",
            recoverable: parsed.code !== "INVALID_JSON",
          },
        },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const { expectedVersion, ...body } = parsed.data;

    // Optimistic concurrency must be based on the version the caller actually
    // edited, not a fresh version read inside this request. Otherwise a second
    // overlapping request can observe the first winner's new version and also
    // succeed, silently overwriting it. The database conditional update below
    // remains the final atomic guard against two writers using the same version.
    if (expectedVersion !== resume.version) throw new ResumeConflictError();

    await saveResumeVersion({
      userId: auth.user.id,
      resumeId: resume.id,
      versionName: `Before manual edit v${resume.version}`,
      resumeJson: resume.content,
      reason: "Pre-edit snapshot",
    });

    const mergedContent = body.content
      ? normalizeResumeContent(mergeResumeContent(resume.content, body.content as Partial<CareerPathResumeContent>))
      : resume.content;

    const updated: CareerPathResume = {
      ...resume,
      ...body,
      id: resume.id,
      userId: resume.userId,
      content: mergedContent,
      version: resume.version + 1,
      updatedAt: new Date().toISOString(),
    };

    // Supabase returns SQL NULL as runtime `null`; the hydrated TypeScript type
    // is optional, so passing that value through without coercion bypasses a
    // default parameter and can make keyword matching call `.match` on null.
    const audit = auditResume(
      updated.content,
      typeof updated.targetRole === "string" ? updated.targetRole : "",
      typeof updated.jobDescription === "string" ? updated.jobDescription : "",
    );
    updated.audit = audit;
    updated.score = audit.score;
    await saveServerResume(updated, auth.user.id, { expectedVersion });

    return NextResponse.json({ resume: updated });
  } catch (error: unknown) {
    if (error instanceof ResumeConflictError) {
      return NextResponse.json(
        { error: { code: "RESUME_CONFLICT", message: "This resume changed while your edit was being saved. Reload and retry.", recoverable: true } },
        { status: 409 },
      );
    }
    logger.error("[api/resume/[id]] PATCH failed", { error });
    return databaseFailure(error, "UPDATE_FAILED", "Unable to update resume.");
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
    return databaseFailure(error, "DELETE_FAILED", "Unable to delete resume.");
  }
}
