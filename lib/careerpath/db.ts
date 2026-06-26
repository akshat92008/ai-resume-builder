/**
 * CareerPath AI — Database Layer
 *
 * Routes all persistence through Supabase when configured,
 * falls back to in-memory server store for development/demo.
 */

import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  memCreateSession,
  memGetSession,
  memUpdateSession,
  memDeleteSession,
  memCreateResume,
  memGetResume,
  memUpdateResume,
  memDeleteResume,
  memListResumes,
  memSaveAgentRun,
} from "./server-store";
import type { BuilderSession, CareerPathResume } from "./types";

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
  if (!isServerSupabaseConfigured) return memGetSession(id);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return memGetSession(id);
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
  if (!isServerSupabaseConfigured) {
    memCreateSession(session);
    return;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    memCreateSession(session);
    return;
  }

  const user = await getSupabaseUser();
  const payload = {
    id: session.id,
    user_id: user?.id || null,
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
  const client = admin || supabase; // Fallback to regular client if admin is missing

  const { error } = await client.from("builder_sessions").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db/saveSession] Error saving session to Supabase:", error);
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

export async function deleteSession(id: string): Promise<void> {
  if (!isServerSupabaseConfigured) {
    memDeleteSession(id);
    return;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("builder_sessions").delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export async function saveServerResume(resume: CareerPathResume): Promise<void> {
  if (!isServerSupabaseConfigured) {
    memCreateResume(resume);
    return;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    memCreateResume(resume);
    return;
  }

  const user = await getSupabaseUser();
  const payload = {
    id: resume.id,
    user_id: user?.id || null,
    profile_id: null, // Avoid FK violation against auth.users
    target_role: resume.targetRole,
    mode: resume.mode,
    status: resume.status,
    title: resume.title,
    content_json: resume.content,
    score_json: resume.score,
    audit_json: resume.audit,
    job_description: resume.jobDescription,
    tailoring_json: resume.tailoring || null,
    version: resume.version,
    updated_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdminClient();
  const client = admin || supabase; // Fallback to regular client if admin is missing

  const { error } = await client.from("resumes").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db/saveServerResume] Error saving resume to Supabase:", error);
    throw new Error(`Failed to save resume: ${error.message}`);
  }
}

export async function getServerResume(id: string): Promise<CareerPathResume | null> {
  if (!isServerSupabaseConfigured) return memGetResume(id);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return memGetResume(id);
  const { data, error } = await supabase.from("resumes").select("*").eq("id", id).single();
  if (error || !data) return null;

  return mapResumeRow(data);
}

export async function listServerResumes(): Promise<CareerPathResume[]> {
  if (!isServerSupabaseConfigured) return memListResumes();

  const supabase = await createServerSupabaseClient();
  if (!supabase) return memListResumes();

  const user = await getSupabaseUser();
  let query = supabase.from("resumes").select("*").order("updated_at", { ascending: false });
  if (user) query = query.eq("user_id", user.id);
  const { data, error } = await query.limit(50);
  if (error || !data) return [];

  return data.map(mapResumeRow);
}

export async function deleteServerResume(id: string): Promise<void> {
  if (!isServerSupabaseConfigured) {
    memDeleteResume(id);
    return;
  }

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
  // Always save to memory for debugging
  memSaveAgentRun(run);

  // Also save to Supabase if available (use admin client to bypass RLS)
  if (!isServerSupabaseConfigured) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  await admin
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
    })
    .then(() => {}, (err) => console.error("[agent_runs] insert failed", err)); // fire-and-forget
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
