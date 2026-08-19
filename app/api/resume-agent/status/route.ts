import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { DatabaseUnavailableError, getLatestResumeForUser, getServerResume } from "@/lib/careerpath/db";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { ResumeMessage } from "@/lib/careerpath/types";

const StatusQuerySchema = z.object({
  operationId: z.string().uuid(),
  resumeId: z.string().uuid().optional(),
}).strict();

function mapMessage(row: Record<string, unknown>): ResumeMessage {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    resumeId: row.resume_id as string | null,
    role: row.role as ResumeMessage["role"],
    content: row.content as string,
    intent: row.intent as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parseResult = StatusQuerySchema.safeParse({
      operationId: url.searchParams.get("operationId") || undefined,
      resumeId: url.searchParams.get("resumeId") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "A valid operationId is required.", recoverable: true } },
        { status: 400 },
      );
    }

    const userId = auth.user.id;
    const { operationId, resumeId: requestedResumeId } = parseResult.data;
    const admin = createSupabaseAdminClient();
    if (!admin) throw new DatabaseUnavailableError("agent status lookup");

    const { data: messageRows, error: messageError } = await admin
      .from("resume_messages")
      .select("id,user_id,resume_id,role,content,intent,created_at")
      .eq("user_id", userId)
      .eq("operation_id", operationId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1);
    if (messageError) {
      logger.error("[resume-agent/status] Message lookup failed", { error: messageError });
      throw new DatabaseUnavailableError("agent status lookup");
    }

    const latestAssistant = messageRows?.[0] ? mapMessage(messageRows[0] as Record<string, unknown>) : null;
    if (!latestAssistant) {
      return NextResponse.json({
        done: false,
        operationId,
        latestAssistant: null,
        resumeId: requestedResumeId || null,
      });
    }

    const resultResumeId = latestAssistant.resumeId || requestedResumeId || null;
    const resume = resultResumeId
      ? await getServerResume(resultResumeId, userId)
      : await getLatestResumeForUser(userId);
    const applications = resume ? await listJobApplications(userId, { limit: 100 }) : [];
    if (resume) resume.applications = applications;

    return NextResponse.json({
      done: true,
      operationId,
      latestAssistant,
      resume: resume || null,
      resumeId: resume?.id || resultResumeId,
      workspace: buildCareerWorkspaceState(resume || null),
    });
  } catch (err) {
    logger.error("[resume-agent/status] Error", { error: err });
    const unavailable = err instanceof DatabaseUnavailableError;
    return NextResponse.json(
      {
        error: {
          code: unavailable ? "DATABASE_UNAVAILABLE" : "STATUS_LOAD_FAILED",
          message: unavailable ? "Agent status is temporarily unavailable. Please retry." : "Unable to load agent status.",
          recoverable: true,
        },
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
