/**
 * CareerPath AI — Database Layer
 * All persistence through Supabase. No in-memory fallbacks.
 */
import { createServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { BuilderSession, CareerPathResume, ResumeMessage } from "./types";

export type ResumeListItem = Pick<CareerPathResume, "id" | "userId" | "title" | "targetRole" | "mode" | "status" | "score" | "version" | "createdAt" | "updatedAt">;
const RESUME_LIST_COLUMNS = ["id","user_id","title","target_role","mode","status","score_json","version","created_at","updated_at"].join(",");

export async function getSupabaseUser() {
  if (!isServerSupabaseConfigured) return null;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data }: { data: unknown } = await supabase.auth.getUser();
  return (data as { user?: { id: string } })?.user ?? null;
}

export async function getSession(id: string): Promise<BuilderSession | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("builder_sessions").select("*").eq("id", id).single();
  if (error || !data) return null;
  return { id: data.id, userId: data.user_id, mode: data.mode as BuilderSession["mode"], targetRole: data.target_role, currentStep: data.current_step as BuilderSession["currentStep"], profile: data.profile_json, messages: data.messages_json, missingQuestions: data.missing_questions_json, resumeId: data.resume_id, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function saveSession(session: BuilderSession): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");
  const user = await getSupabaseUser();
  const ownerId = user?.id || session.userId;
  if (!ownerId) throw new Error("Cannot save session without an authenticated owner");
  const payload = { id: session.id, user_id: ownerId, mode: session.mode, target_role: session.targetRole, current_step: session.currentStep, profile_json: session.profile, messages_json: session.messages, missing_questions_json: session.missingQuestions, resume_id: session.resumeId, updated_at: new Date().toISOString() };
  const client = user ? supabase : createSupabaseAdminClient();
  if (!client) throw new Error("Supabase not configured");
  const { error } = await client.from("builder_sessions").upsert(payload, { onConflict: "id" });
  if (error) { logger.error("[db/saveSession] Error saving session to Supabase", { error }); throw new Error(`Failed to save session: ${error.message}`); }
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient(); if (!supabase) return;
  await supabase.from("builder_sessions").delete().eq("id", id);
}

export async function saveServerResume(resume: CareerPathResume, ownerUserId?: string): Promise<void> {
  const supabase = ownerUserId ? null : await createServerSupabaseClient();
  const user = ownerUserId ? null : await getSupabaseUser();
  const ownerId = ownerUserId || user?.id;
  if (!ownerId) throw new Error("Cannot save resume without an authenticated owner");
  const payload = {
    id: resume.id, user_id: ownerId, profile_id: null, target_role: resume.targetRole, mode: resume.mode, status: resume.status, title: resume.title,
    profile_json: resume.profile || null, career_profile_json: resume.careerProfile || null, resume_document_json: resume.resumeDocument || null,
    application_pack_json: resume.applicationPack || null, applications_json: resume.applications || [], job_search_insights_json: resume.jobSearchInsights || [],
    content_json: resume.content, score_json: resume.score, audit_json: resume.audit, job_description: resume.jobDescription, style: resume.style || "modern",
    tailoring_json: resume.tailoring || null,
    differentiation_json: { starInterview: resume.starInterview || null, humanizedResume: resume.humanizedResume || null, impactEstimates: resume.impactEstimates || null, gapAnalysis: resume.gapAnalysis || null, multiPersona: resume.multiPersona || null, atsView: resume.atsView || null, outreachPack: resume.outreachPack || null },
    version: resume.version, updated_at: new Date().toISOString(),
  };
  const client = ownerUserId ? createSupabaseAdminClient() : supabase;
  if (!client) throw new Error("Supabase not configured");
  const { error } = await client.from("resumes").upsert(payload, { onConflict: "id" });
  if (error) { logger.error("[db/saveServerResume] Error saving resume to Supabase", { error }); throw new Error(`Failed to save resume: ${error.message}`); }
}

export async function getServerResume(id: string, userId?: string): Promise<CareerPathResume | null> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser();
  const ownerId = userId || user?.id;
  const client = userId ? createSupabaseAdminClient() : supabase;
  if (!client || !ownerId) return null;
  const { data, error } = await client.from("resumes").select("*").eq("id", id).eq("user_id", ownerId).single();
  if (error || !data) return null;
  return mapResumeRow(data);
}

export async function listServerResumes(): Promise<CareerPathResume[]> {
  const supabase = await createServerSupabaseClient(); if (!supabase) return [];
  const user = await getSupabaseUser(); if (!user) return [];
  const { data, error } = await supabase.from("resumes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
  if (error || !data) return [];
  return data.map(mapResumeRow);
}

export async function listServerResumeSummaries(): Promise<ResumeListItem[]> {
  const supabase = await createServerSupabaseClient(); if (!supabase) return [];
  const user = await getSupabaseUser(); if (!user) return [];
  const { data, error } = await supabase.from("resumes").select(RESUME_LIST_COLUMNS).eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
  if (error || !data) return [];
  return (data as unknown as Record<string, unknown>[]).map(mapResumeListRow);
}

export async function deleteServerResume(id: string, userId?: string): Promise<void> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser(); const ownerId = userId || user?.id;
  if (!ownerId) throw new Error("Cannot delete resume without an authenticated owner");
  const client = userId ? createSupabaseAdminClient() : supabase; if (!client) return;
  await client.from("resumes").delete().eq("id", id).eq("user_id", ownerId);
}

export async function duplicateServerResume(id: string, userId?: string): Promise<CareerPathResume | null> {
  const original = await getServerResume(id, userId); if (!original) return null;
  const now = new Date().toISOString();
  const copy: CareerPathResume = { ...original, id: crypto.randomUUID(), title: `${original.title} v${original.version + 1}`, version: original.version + 1, createdAt: now, updatedAt: now };
  await saveServerResume(copy, userId || original.userId); return copy;
}

export async function getLatestResumeForUser(userId: string): Promise<CareerPathResume | null> {
  const admin = createSupabaseAdminClient(); if (!admin) return null;
  const { data, error } = await admin.from("resumes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).single();
  if (error || !data) return null; return mapResumeRow(data);
}

export async function saveResumeMessage(msg: { userId: string; resumeId: string | null; role: "user" | "assistant" | "system"; content: string; intent?: string; }): Promise<void> {
  const client = createSupabaseAdminClient(); if (!client) { logger.error("[db/saveResumeMessage] DB client not available"); return; }
  const { error } = await client.from("resume_messages").insert({ user_id: msg.userId, resume_id: msg.resumeId, role: msg.role, content: msg.content, intent: msg.intent || null });
  if (error) logger.error("[db/saveResumeMessage] Error", { error });
}

export async function getResumeMessages(resumeId: string, userId: string): Promise<ResumeMessage[]> {
  const admin = createSupabaseAdminClient(); if (!admin) return [];
  const { data, error } = await admin.from("resume_messages").select("*").eq("resume_id", resumeId).eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
  if (error || !data) return [];
  return data.map(mapResumeMessageRow);
}

export async function getLatestMessagesForUser(userId: string, resumeId?: string): Promise<ResumeMessage[]> {
  const admin = createSupabaseAdminClient(); if (!admin) return [];
  let query = admin.from("resume_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
  if (resumeId) query = query.or(`resume_id.eq.${resumeId},resume_id.is.null`);
  const { data, error } = await query; if (error || !data) return [];
  return data.map(mapResumeMessageRow);
}

export async function saveResumeVersion(version: { userId: string; resumeId: string; versionName?: string; resumeJson: unknown; reason?: string; }): Promise<void> {
  const client = createSupabaseAdminClient(); if (!client) { logger.error("[db/saveResumeVersion] DB client not available"); return; }
  const { error } = await client.from("resume_versions").insert({ user_id: version.userId, resume_id: version.resumeId, version_name: version.versionName || null, resume_json: version.resumeJson, reason: version.reason || null });
  if (error) logger.error("[db/saveResumeVersion] Error", { error });
}

type AgentRunInput = {
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
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  attempts?: number;
};

function telemetryShape(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return { type: "string", length: value.length };
  if (typeof value === "number" || typeof value === "boolean") return { type: typeof value };
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      sampleShapes: value.slice(0, 3).map(telemetryShape),
    };
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      type: "object",
      keys: Object.keys(record).slice(0, 40),
      fields: Object.fromEntries(Object.entries(record).slice(0, 20).map(([key, item]) => [key, telemetryShape(item)])),
    };
  }
  return { type: typeof value };
}

function telemetryPayload(value: unknown) {
  const allowRaw = process.env.AGENT_TELEMETRY_CAPTURE_CONTENT === "true" && process.env.NODE_ENV !== "production";
  return allowRaw ? value ?? {} : telemetryShape(value ?? {});
}

function configuredEstimatedCost(run: AgentRunInput) {
  if (typeof run.estimatedCostUsd === "number" && Number.isFinite(run.estimatedCostUsd) && run.estimatedCostUsd >= 0) {
    return run.estimatedCostUsd;
  }
  const inputRate = Number(process.env.AI_COST_INPUT_USD_PER_1M || "0");
  const outputRate = Number(process.env.AI_COST_OUTPUT_USD_PER_1M || "0");
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate < 0 || outputRate < 0) return null;
  if (!run.inputTokens && !run.outputTokens) return null;
  const total = ((run.inputTokens || 0) * inputRate + (run.outputTokens || 0) * outputRate) / 1_000_000;
  return Math.round(total * 1_000_000) / 1_000_000;
}

/**
 * Central AI telemetry boundary. Production stores shape/operational metadata
 * by default instead of raw resume, job-description or model-output bodies.
 */
export async function saveAgentRun(run: AgentRunInput): Promise<void> {
  if (!isServerSupabaseConfigured) return;
  const client = createSupabaseAdminClient(); if (!client) return;
  const inputTokens = Number.isFinite(run.inputTokens) ? Math.max(0, Math.round(run.inputTokens || 0)) : null;
  const outputTokens = Number.isFinite(run.outputTokens) ? Math.max(0, Math.round(run.outputTokens || 0)) : null;
  const totalTokens = Number.isFinite(run.totalTokens)
    ? Math.max(0, Math.round(run.totalTokens || 0))
    : inputTokens !== null || outputTokens !== null
      ? (inputTokens || 0) + (outputTokens || 0)
      : null;

  const { error } = await client.from("agent_runs").insert({
    id: crypto.randomUUID(),
    user_id: run.userId || null,
    resume_id: run.resumeId || null,
    session_id: run.sessionId || null,
    agent_name: run.agentName,
    input_json: telemetryPayload(run.inputJson),
    output_json: telemetryPayload(run.outputJson),
    status: run.status,
    error: run.error ? run.error.slice(0, 2000) : null,
    latency_ms: run.latencyMs || null,
    model: run.model || null,
    provider: run.provider || null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: configuredEstimatedCost(run),
    attempts: Math.max(1, Math.round(run.attempts || 1)),
  });
  if (error) logger.error("[agent_runs] insert failed", { error });
}

function mapResumeMessageRow(row: Record<string, unknown>): ResumeMessage {
  return { id: row.id as string, userId: row.user_id as string, resumeId: row.resume_id as string | null, role: row.role as ResumeMessage["role"], content: row.content as string, intent: row.intent as string | undefined, createdAt: row.created_at as string };
}

function mapResumeRow(data: Record<string, unknown>): CareerPathResume {
  const differentiation = (data.differentiation_json as Record<string, unknown> | null) || {};
  return {
    id: data.id as string, userId: data.user_id as string, profileId: data.profile_id as string | undefined, title: data.title as string,
    targetRole: (data.target_role as string) || "", mode: (data.mode as CareerPathResume["mode"]) || "build", status: (data.status as CareerPathResume["status"]) || "draft",
    style: data.style as string | undefined, profile: data.profile_json as CareerPathResume["profile"], careerProfile: data.career_profile_json as CareerPathResume["careerProfile"],
    resumeDocument: data.resume_document_json as CareerPathResume["resumeDocument"], applicationPack: data.application_pack_json as CareerPathResume["applicationPack"],
    applications: data.applications_json as CareerPathResume["applications"], jobSearchInsights: data.job_search_insights_json as CareerPathResume["jobSearchInsights"],
    content: data.content_json as CareerPathResume["content"], score: data.score_json as CareerPathResume["score"], audit: data.audit_json as CareerPathResume["audit"],
    jobDescription: data.job_description as string | undefined, tailoring: data.tailoring_json as CareerPathResume["tailoring"],
    starInterview: differentiation.starInterview as CareerPathResume["starInterview"], humanizedResume: differentiation.humanizedResume as CareerPathResume["humanizedResume"], impactEstimates: differentiation.impactEstimates as CareerPathResume["impactEstimates"], gapAnalysis: differentiation.gapAnalysis as CareerPathResume["gapAnalysis"], multiPersona: differentiation.multiPersona as CareerPathResume["multiPersona"], atsView: differentiation.atsView as CareerPathResume["atsView"], outreachPack: differentiation.outreachPack as CareerPathResume["outreachPack"],
    version: (data.version as number) || 1, createdAt: data.created_at as string, updatedAt: data.updated_at as string,
  };
}

function mapResumeListRow(data: Record<string, unknown>): ResumeListItem {
  return { id: data.id as string, userId: data.user_id as string, title: data.title as string, targetRole: (data.target_role as string) || "", mode: (data.mode as CareerPathResume["mode"]) || "build", status: (data.status as CareerPathResume["status"]) || "draft", score: data.score_json as CareerPathResume["score"], version: (data.version as number) || 1, createdAt: data.created_at as string, updatedAt: data.updated_at as string };
}
