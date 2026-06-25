import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BuilderSession, CareerPathResume } from "./types";

export async function getSupabaseUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data }: { data: any } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function getSession(id: string): Promise<BuilderSession | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("builder_sessions").select("*").eq("id", id).single();
  if (error || !data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    mode: data.mode as any,
    targetRole: data.target_role,
    currentStep: data.current_step as any,
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
  if (!supabase) return;
  const user = await getSupabaseUser();
  
  const payload = {
    id: session.id,
    user_id: user?.id,
    mode: session.mode,
    target_role: session.targetRole,
    current_step: session.currentStep,
    profile_json: session.profile,
    messages_json: session.messages,
    missing_questions_json: session.missingQuestions,
    resume_id: session.resumeId,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("builder_sessions").upsert(payload, { onConflict: "id" });
}

export async function saveServerResume(resume: CareerPathResume): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  const user = await getSupabaseUser();

  const payload = {
    id: resume.id,
    user_id: user?.id,
    profile_id: resume.profileId,
    target_role: resume.targetRole,
    mode: resume.mode,
    status: resume.status,
    title: resume.title,
    content_json: resume.content,
    score_json: resume.score,
    audit_json: resume.audit,
    job_description: resume.jobDescription,
    version: resume.version,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("resumes").upsert(payload, { onConflict: "id" });
}

export async function getServerResume(id: string): Promise<CareerPathResume | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("resumes").select("*").eq("id", id).single();
  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    profileId: data.profile_id,
    title: data.title,
    targetRole: data.target_role,
    mode: data.mode as any,
    status: data.status as any,
    content: data.content_json,
    score: data.score_json,
    audit: data.audit_json,
    jobDescription: data.job_description,
    version: data.version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
