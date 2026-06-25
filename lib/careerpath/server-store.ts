/**
 * CareerPath AI — Server-Side In-Memory Store
 *
 * Used as a fallback when Supabase is not configured.
 * Data does NOT persist across server restarts.
 * For development/demo mode only.
 */

import type { BuilderSession, CareerPathResume, CareerPathProfile } from "./types";

type AgentRunRecord = {
  id: string;
  userId?: string;
  resumeId?: string;
  sessionId?: string;
  agentName: string;
  inputJson?: unknown;
  outputJson?: unknown;
  status: string;
  error?: string;
  latencyMs?: number;
  model?: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const sessions = new Map<string, BuilderSession>();
const resumes = new Map<string, CareerPathResume>();
const profiles = new Map<string, CareerPathProfile>();
const agentRuns: AgentRunRecord[] = [];

let _warned = false;
function warnOnce() {
  if (_warned) return;
  _warned = true;
  console.warn(
    "⚠ CareerPath AI: Running in dev mode with in-memory store. " +
    "Data will NOT persist across server restarts. " +
    "Configure Supabase for production persistence."
  );
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function memCreateSession(session: BuilderSession): void {
  warnOnce();
  sessions.set(session.id, structuredClone(session));
}

export function memGetSession(id: string): BuilderSession | null {
  warnOnce();
  const s = sessions.get(id);
  return s ? structuredClone(s) : null;
}

export function memUpdateSession(session: BuilderSession): void {
  sessions.set(session.id, structuredClone(session));
}

export function memDeleteSession(id: string): void {
  sessions.delete(id);
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export function memCreateResume(resume: CareerPathResume): void {
  warnOnce();
  resumes.set(resume.id, structuredClone(resume));
}

export function memGetResume(id: string): CareerPathResume | null {
  const r = resumes.get(id);
  return r ? structuredClone(r) : null;
}

export function memUpdateResume(resume: CareerPathResume): void {
  resumes.set(resume.id, structuredClone(resume));
}

export function memDeleteResume(id: string): void {
  resumes.delete(id);
}

export function memListResumes(userId?: string): CareerPathResume[] {
  const all = Array.from(resumes.values());
  const filtered = userId ? all.filter((r) => r.userId === userId) : all;
  return filtered
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((r) => structuredClone(r));
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function memCreateProfile(profile: CareerPathProfile): void {
  warnOnce();
  profiles.set(profile.id, structuredClone(profile));
}

export function memGetProfile(id: string): CareerPathProfile | null {
  const p = profiles.get(id);
  return p ? structuredClone(p) : null;
}

export function memUpdateProfile(profile: CareerPathProfile): void {
  profiles.set(profile.id, structuredClone(profile));
}

// ---------------------------------------------------------------------------
// Agent Runs
// ---------------------------------------------------------------------------

export function memSaveAgentRun(run: Omit<AgentRunRecord, "id" | "createdAt">): void {
  agentRuns.push({
    ...run,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  // Keep only last 500 runs in memory
  if (agentRuns.length > 500) agentRuns.splice(0, agentRuns.length - 500);
}
