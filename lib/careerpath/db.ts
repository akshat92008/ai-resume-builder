/**
 * CareerPath AI — Database Layer
 *
 * All persistence through Supabase. No in-memory fallbacks.
 */

import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BuilderSession, CareerPathResume, ResumeMessage, ResumeVersion } from "./types";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

export async function getSupabaseUser() {
  if (!isServerSupabaseConfigured) return null;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data }: { data: unknown } = await supabase.auth.getUser();
  return (data as { user?: { id: string } })?.user ?? null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getSession(id: string): Promise<BuilderSession | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("builder_sessions").select("*").eq("id", id).single();
  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    mode: data.mode as BuilderSession["mode"],
    targetRole: data.target_role,
    currentStep: data.current_step as BuilderSession["currentStep"],
    profile: data.profile_json,
    messages: data.messages_json,
    missingQuestions: data.missing_questions_json,
    resumeId: data.resume_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveSession(session: BuilderSession): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const user = await getSupabaseUser();
  const payload = {
    id: session.id,
    user_id: user?.id || session.userId || null,
    mode: session.mode,
    target_role: session.targetRole,
    current_step: session.currentStep,
    profile_json: session.profile,
    messages_json: session.messages,
    missing_questions_json: session.missingQuestions,
    resume_id: session.resumeId,
    updated_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();
  const client = admin || supabase;

  const { error } = await client.from("builder_sessions").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db/saveSession] Error saving session to Supabase:", error);
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("builder_sessions").delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export async function saveServerResume(resume: CareerPathResume): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const user = await getSupabaseUser();
  const payload = {
    id: resume.id,
    user_id: user?.id || resume.userId || null,
    profile_id: null,
    target_role: resume.targetRole,
    mode: resume.mode,
    status: resume.status,
    title: resume.title,
    profile_json: resume.profile || null,
    career_profile_json: resume.careerProfile || null,
    resume_document_json: resume.resumeDocument || null,
    application_pack_json: resume.applicationPack || null,
    applications_json: resume.applications || [],
    job_search_insights_json: resume.jobSearchInsights || [],
    content_json: resume.content,
    score_json: resume.score,
    audit_json: resume.audit,
    job_description: resume.jobDescription,
    tailoring_json: resume.tailoring || null,
    version: resume.version,
    updated_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();
  const client = admin || supabase;

  const { error } = await client.from("resumes").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db/saveServerResume] Error saving resume to Supabase:", error);
    throw new Error(`Failed to save resume: ${error.message}`);
  }
}

export async function getServerResume(id: string, userId?: string): Promise<CareerPathResume | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  let query = supabase.from("resumes").select("*").eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.single();
  if (error || !data) return null;

  return mapResumeRow(data);
}

export async function listServerResumes(): Promise<CareerPathResume[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const user = await getSupabaseUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];

  return data.map(mapResumeRow);
}

export async function deleteServerResume(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("resumes").delete().eq("id", id);
}

export async function duplicateServerResume(id: string): Promise<CareerPathResume | null> {
  const original = await getServerResume(id);
  if (!original) return null;

  const now = new Date().toISOString();
  const copy: CareerPathResume = {
    ...original,
    id: crypto.randomUUID(),
    title: `${original.title} v${original.version + 1}`,
    version: original.version + 1,
    createdAt: now,
    updatedAt: now,
  };

  await saveServerResume(copy);
  return copy;
}

/**
 * Get the most recent resume for a given user.
 */
export async function getLatestResumeForUser(userId: string): Promise<CareerPathResume | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapResumeRow(data);
}

// ---------------------------------------------------------------------------
// Resume Messages
// ---------------------------------------------------------------------------

export async function saveResumeMessage(msg: {
  userId: string;
  resumeId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[db/saveResumeMessage] Admin client not available");
    return;
  }

  const { error } = await admin.from("resume_messages").insert({
    user_id: msg.userId,
    resume_id: msg.resumeId,
    role: msg.role,
    content: msg.content,
    intent: msg.intent || null,
  });

  if (error) {
    console.error("[db/saveResumeMessage] Error:", error);
  }
}

export async function getResumeMessages(
  resumeId: string,
  userId: string
): Promise<ResumeMessage[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("resume_messages")
    .select("*")
    .eq("resume_id", resumeId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    resumeId: row.resume_id as string | null,
    role: row.role as ResumeMessage["role"],
    content: row.content as string,
    intent: row.intent as string | undefined,
    createdAt: row.created_at as string,
  }));
}

/**
 * Get recent messages for user without a specific resume (for workspace load).
 */
export async function getLatestMessagesForUser(
  userId: string,
  resumeId?: string
): Promise<ResumeMessage[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("resume_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (resumeId) {
    query = query.eq("resume_id", resumeId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    resumeId: row.resume_id as string | null,
    role: row.role as ResumeMessage["role"],
    content: row.content as string,
    intent: row.intent as string | undefined,
    createdAt: row.created_at as string,
  }));
}

// ---------------------------------------------------------------------------
// Resume Versions
// ---------------------------------------------------------------------------

export async function saveResumeVersion(version: {
  userId: string;
  resumeId: string;
  versionName?: string;
  resumeJson: unknown;
  reason?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[db/saveResumeVersion] Admin client not available");
    return;
  }

  const { error } = await admin.from("resume_versions").insert({
    user_id: version.userId,
    resume_id: version.resumeId,
    version_name: version.versionName || null,
    resume_json: version.resumeJson,
    reason: version.reason || null,
  });

  if (error) {
    console.error("[db/saveResumeVersion] Error:", error);
  }
}

// ---------------------------------------------------------------------------
// Agent Runs
// ---------------------------------------------------------------------------

export async function saveAgentRun(run: {
  agentName: string;
  userId?: string;
  resumeId?: string;
  sessionId?: string;
  inputJson?: unknown;
  outputJson?: unknown;
  status: string;
  error?: string;
  latencyMs?: number;
  model?: string;
}): Promise<void> {
  if (!isServerSupabaseConfigured) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { error: insertError } = await admin
    .from("agent_runs")
    .insert({
      id: crypto.randomUUID(),
      user_id: run.userId || null,
      resume_id: run.resumeId || null,
      session_id: run.sessionId || null,
      agent_name: run.agentName,
      input_json: run.inputJson || {},
      output_json: run.outputJson || {},
      status: run.status,
      error: run.error || null,
      latency_ms: run.latencyMs || null,
      model: run.model || null,
    });

  if (insertError) {
    console.error("[agent_runs] insert failed", insertError);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapResumeRow(data: Record<string, unknown>): CareerPathResume {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    profileId: data.profile_id as string | undefined,
    title: data.title as string,
    targetRole: (data.target_role as string) || "",
    mode: (data.mode as CareerPathResume["mode"]) || "build",
    status: (data.status as CareerPathResume["status"]) || "draft",
    profile: data.profile_json as CareerPathResume["profile"],
    careerProfile: data.career_profile_json as CareerPathResume["careerProfile"],
    resumeDocument: data.resume_document_json as CareerPathResume["resumeDocument"],
    applicationPack: data.application_pack_json as CareerPathResume["applicationPack"],
    applications: data.applications_json as CareerPathResume["applications"],
    jobSearchInsights: data.job_search_insights_json as CareerPathResume["jobSearchInsights"],
    content: data.content_json as CareerPathResume["content"],
    score: data.score_json as CareerPathResume["score"],
    audit: data.audit_json as CareerPathResume["audit"],
    jobDescription: data.job_description as string | undefined,
    tailoring: data.tailoring_json as CareerPathResume["tailoring"],
    version: (data.version as number) || 1,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
