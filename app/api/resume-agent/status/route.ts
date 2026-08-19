import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { getLatestResumeForUser, getServerResume } from "@/lib/careerpath/db";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { ResumeMessage } from "@/lib/careerpath/types";

const StatusQuerySchema = z.object({
  after: z.string().datetime().optional(),
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
      after: url.searchParams.get("after") || undefined,
      resumeId: url.searchParams.get("resumeId") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid status query.", recoverable: true } },
        { status: 400 },
      );
    }

    const userId = auth.user.id;
    const requestedResumeId = parseResult.data.resumeId;
    const afterIso = parseResult.data.after
      ? new Date(Date.parse(parseResult.data.after) - 1000).toISOString()
      : new Date(0).toISOString();

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: { code: "STATUS_LOAD_FAILED", message: "Unable to load agent status.", recoverable: true } },
        { status: 503 },
      );
    }

    let messageQuery = admin
      .from("resume_messages")
      .select("id,user_id,resume_id,role,content,intent,created_at")
      .eq("user_id", userId)
      .eq("role", "assistant")
      .gt("created_at", afterIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (requestedResumeId) {
      messageQuery = messageQuery.or(`resume_id.eq.${requestedResumeId},resume_id.is.null`);
    }

    const { data: messageRows, error: messageError } = await messageQuery;
    if (messageError) throw messageError;

    const latestAssistant = messageRows?.[0] ? mapMessage(messageRows[0] as Record<string, unknown>) : null;
    if (!latestAssistant) {
      return NextResponse.json({
        done: false,
        latestAssistant: null,
        resumeId: requestedResumeId || null,
      });
    }

    // Polling stays tiny while a job is running. Fetch the heavier result only once,
    // after the completion message is visible.
    const resume = requestedResumeId
      ? await getServerResume(requestedResumeId, userId)
      : await getLatestResumeForUser(userId);
    const applications = resume ? await listJobApplications(userId, { limit: 100 }) : [];
    if (resume) resume.applications = applications;

    return NextResponse.json({
      done: true,
      latestAssistant,
      resume: resume || null,
      resumeId: resume?.id || requestedResumeId || null,
      workspace: buildCareerWorkspaceState(resume || null),
    });
  } catch (err) {
    logger.error("[resume-agent/status] Error", { error: err });
    return NextResponse.json(
      { error: { code: "STATUS_LOAD_FAILED", message: "Unable to load agent status.", recoverable: true } },
      { status: 500 },
    );
  }
}
