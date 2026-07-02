/**
 * CareerOS — Job Tracker DB Methods
 *
 * Persistence for job applications and related models.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "./db";
import type { JobApplication, JobDescription, ApplicationPack } from "./types";

// ---------------------------------------------------------------------------
// Job Applications
// ---------------------------------------------------------------------------

export async function listJobApplications(userId?: string): Promise<JobApplication[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const uid = userId || (await getSupabaseUser())?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.error("[db-jobs] Error listing job applications:", error);
    return [];
  }

  return data.map(mapJobApplicationRecord);
}

export async function getJobApplication(id: string): Promise<JobApplication | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapJobApplicationRecord(data);
}

export async function saveJobApplication(application: JobApplication): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const user = await getSupabaseUser();
  const payload = {
    id: application.id,
    user_id: user?.id || application.userId || null,
    company: application.company,
    role: application.role,
    job_url: application.jobUrl,
    job_description_id: application.jobDescriptionId,
    resume_id: application.resumeId,
    application_pack_id: application.applicationPackId,
    status: application.status,
    applied_at: application.appliedAt,
    follow_up_at: application.followUpAt,
    notes: application.notes,
    outcome: application.outcome,
    salary_min: application.salaryMin,
    salary_max: application.salaryMax,
    currency: application.currency,
    bonus: application.bonus,
    equity: application.equity,
    benefits_json: application.benefits,
    location: application.location,
    work_type: application.workType,
    stage: application.stage,
    offer_deadline: application.offerDeadline,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("job_applications").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db-jobs] Error saving job application:", error);
    throw new Error(`Failed to save job application: ${error.message}`);
  }
}

export async function deleteJobApplication(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("job_applications").delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Job Descriptions
// ---------------------------------------------------------------------------

export async function saveJobDescription(jd: JobDescription): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const user = await getSupabaseUser();
  const payload = {
    id: jd.id,
    user_id: user?.id || null,
    raw_text: jd.rawText,
    extracted: {
      title: jd.title,
      company: jd.company,
      location: jd.location,
      extractedSkills: jd.extractedSkills,
      responsibilities: jd.responsibilities,
      hiddenExpectations: jd.hiddenExpectations,
      requiredExperience: jd.requiredExperience,
      seniority: jd.seniority,
      salaryClues: jd.salaryClues,
      requiredTools: jd.requiredTools,
      niceToHaveSkills: jd.niceToHaveSkills,
      industry: jd.industry,
      keywords: jd.keywords,
    },
  };

  const { error } = await supabase.from("job_descriptions").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db-jobs] Error saving job description:", error);
    throw new Error(`Failed to save job description: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Application Packs
// ---------------------------------------------------------------------------

export async function saveApplicationPack(pack: ApplicationPack): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const user = await getSupabaseUser();
  const payload = {
    id: pack.id,
    user_id: user?.id || null,
    job_description_id: pack.jobId,
    resume_id: pack.resumeId,
    pack: {
      coverLetter: pack.coverLetter,
      recruiterDM: pack.recruiterDM,
      coldEmail: pack.coldEmail,
      linkedinMessage: pack.linkedinMessage,
      whyFitAnswer: pack.whyFitAnswer,
      interviewQuestions: pack.interviewQuestions,
      missingSkills: pack.missingSkills,
      preparationPlan: pack.preparationPlan,
      followUpMessage: pack.followUpMessage,
    },
  };

  const { error } = await supabase.from("application_packs").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[db-jobs] Error saving application pack:", error);
    throw new Error(`Failed to save application pack: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapJobApplicationRecord(data: any): JobApplication {
  return {
    id: data.id,
    userId: data.user_id,
    company: data.company,
    role: data.role,
    jobUrl: data.job_url,
    jobDescriptionId: data.job_description_id,
    resumeId: data.resume_id,
    applicationPackId: data.application_pack_id,
    status: data.status,
    appliedAt: data.applied_at,
    followUpAt: data.follow_up_at,
    notes: data.notes,
    outcome: data.outcome,
    salaryMin: data.salary_min,
    salaryMax: data.salary_max,
    currency: data.currency,
    bonus: data.bonus,
    equity: data.equity,
    benefits: data.benefits_json,
    location: data.location,
    workType: data.work_type,
    stage: data.stage,
    offerDeadline: data.offer_deadline,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
