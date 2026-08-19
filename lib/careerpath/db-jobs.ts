/** CareerOS — canonical job application persistence. */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUser } from "./db";
import { DatabaseUnavailableError } from "./db-errors";
import type { JobApplication, JobDescription, ApplicationPack } from "./types";
import type { CareerLoopJobApplication } from "@/lib/careerloop/types";
import { logger } from "@/lib/observability/logger";

export { DatabaseUnavailableError } from "./db-errors";

type OwnedTable = "resumes" | "job_descriptions" | "application_packs";

async function assertOwnedReference(
  client: ReturnType<typeof createSupabaseAdminClient>,
  table: OwnedTable,
  id: string | null | undefined,
  userId: string,
) {
  if (!id) return;
  const { data, error } = await client.from(table).select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) {
    logger.error("[db-jobs] Failed to verify related record ownership", { table, error });
    throw new DatabaseUnavailableError("related-record ownership verification");
  }
  if (!data) throw new Error("Referenced record does not belong to the authenticated user");
}

export async function listJobApplications(
  userId?: string,
  options: { limit?: number; offset?: number } = {},
): Promise<JobApplication[]> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser();
  const uid = userId || user?.id;
  if (!uid) return [];
  const client = userId ? createSupabaseAdminClient() : supabase;
  if (!client) throw new DatabaseUnavailableError("job application listing");
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const { data, error } = await client
    .from("job_applications")
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    logger.error("[db-jobs] Error listing job applications", { error });
    throw new DatabaseUnavailableError("job application listing");
  }
  return (data || []).map(mapJobApplicationRecord);
}

export async function getJobApplication(id: string, userId?: string): Promise<JobApplication | null> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser();
  const uid = userId || user?.id;
  if (!uid) return null;
  const client = userId ? createSupabaseAdminClient() : supabase;
  if (!client) throw new DatabaseUnavailableError("job application lookup");
  const { data, error } = await client.from("job_applications").select("*").eq("id", id).eq("user_id", uid).maybeSingle();
  if (error) {
    logger.error("[db-jobs] Error loading job application", { error });
    throw new DatabaseUnavailableError("job application lookup");
  }
  return data ? mapJobApplicationRecord(data) : null;
}

export async function saveJobApplication(application: JobApplication, userId?: string): Promise<void> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser();
  const uid = userId || user?.id;
  if (!uid) throw new Error("Cannot save job application without an authenticated owner");
  const client = userId ? createSupabaseAdminClient() : supabase;
  if (!client) throw new DatabaseUnavailableError("job application save");
  const tracked = application as CareerLoopJobApplication;

  // Background jobs use the service-role client, which bypasses RLS. Every foreign
  // reference must therefore be re-scoped to the same tenant before persistence.
  if (userId) {
    const admin = client as ReturnType<typeof createSupabaseAdminClient>;
    await Promise.all([
      assertOwnedReference(admin, "job_descriptions", application.jobDescriptionId, uid),
      assertOwnedReference(admin, "resumes", application.resumeId, uid),
      assertOwnedReference(admin, "application_packs", application.applicationPackId, uid),
    ]);
  }

  const payload = {
    id: application.id, user_id: uid, company: application.company, role: application.role,
    job_url: application.jobUrl, job_description_id: application.jobDescriptionId,
    career_resume_id: application.resumeId, resume_version: tracked.resumeVersion,
    source: tracked.source, fit_score: tracked.fitScore, fit_recommendation: tracked.fitRecommendation,
    application_pack_id: application.applicationPackId, status: application.status, applied_at: application.appliedAt,
    follow_up_at: application.followUpAt, notes: application.notes, outcome: application.outcome,
    salary_min: application.salaryMin, salary_max: application.salaryMax, currency: application.currency,
    bonus: application.bonus, equity: application.equity, benefits_json: application.benefits,
    location: application.location, work_type: application.workType, stage: application.stage,
    offer_deadline: application.offerDeadline, updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("job_applications").upsert(payload, { onConflict: "id" });
  if (error) {
    logger.error("[db-jobs] Error saving job application", { error });
    throw new DatabaseUnavailableError("job application save");
  }
}

export async function deleteJobApplication(id: string, userId?: string): Promise<void> {
  const supabase = userId ? null : await createServerSupabaseClient();
  const user = userId ? null : await getSupabaseUser();
  const uid = userId || user?.id;
  if (!uid) throw new Error("Cannot delete job application without an authenticated owner");
  const client = userId ? createSupabaseAdminClient() : supabase;
  if (!client) throw new DatabaseUnavailableError("job application delete");
  const { error } = await client.from("job_applications").delete().eq("id", id).eq("user_id", uid);
  if (error) {
    logger.error("[db-jobs] Error deleting job application", { error });
    throw new DatabaseUnavailableError("job application delete");
  }
}

export async function saveJobDescription(jd: JobDescription): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new DatabaseUnavailableError("job description save");
  const user = await getSupabaseUser();
  if (!user) throw new Error("Authentication required");
  const payload = { id: jd.id, user_id: user.id, raw_text: jd.rawText, extracted: { title: jd.title, company: jd.company, location: jd.location, extractedSkills: jd.extractedSkills, responsibilities: jd.responsibilities, hiddenExpectations: jd.hiddenExpectations, requiredExperience: jd.requiredExperience, seniority: jd.seniority, salaryClues: jd.salaryClues, requiredTools: jd.requiredTools, niceToHaveSkills: jd.niceToHaveSkills, industry: jd.industry, keywords: jd.keywords } };
  const { error } = await supabase.from("job_descriptions").upsert(payload, { onConflict: "id" });
  if (error) throw new DatabaseUnavailableError("job description save");
}

export async function saveApplicationPack(pack: ApplicationPack): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new DatabaseUnavailableError("application pack save");
  const user = await getSupabaseUser();
  if (!user) throw new Error("Authentication required");
  const payload = { id: pack.id, user_id: user.id, job_description_id: pack.jobId, resume_id: pack.resumeId, pack: { coverLetter: pack.coverLetter, recruiterDM: pack.recruiterDM, coldEmail: pack.coldEmail, linkedinMessage: pack.linkedinMessage, whyFitAnswer: pack.whyFitAnswer, interviewQuestions: pack.interviewQuestions, missingSkills: pack.missingSkills, preparationPlan: pack.preparationPlan, followUpMessage: pack.followUpMessage } };
  const { error } = await supabase.from("application_packs").upsert(payload, { onConflict: "id" });
  if (error) throw new DatabaseUnavailableError("application pack save");
}

function mapJobApplicationRecord(data: Record<string, unknown>): CareerLoopJobApplication {
  return {
    id: data.id as string, userId: data.user_id as string, company: data.company as string, role: data.role as string,
    jobUrl: data.job_url as string | undefined, jobDescriptionId: data.job_description_id as string | undefined,
    resumeId: (data.career_resume_id || data.resume_id) as string | undefined, resumeVersion: data.resume_version as number | undefined,
    source: data.source as CareerLoopJobApplication["source"], fitScore: data.fit_score as number | undefined,
    fitRecommendation: data.fit_recommendation as CareerLoopJobApplication["fitRecommendation"], applicationPackId: data.application_pack_id as string | undefined,
    status: data.status as JobApplication["status"], appliedAt: data.applied_at as string | undefined,
    followUpAt: data.follow_up_at as string | undefined, notes: data.notes as string | undefined, outcome: data.outcome as JobApplication["outcome"],
    salaryMin: data.salary_min as number | undefined, salaryMax: data.salary_max as number | undefined, currency: data.currency as string | undefined,
    bonus: data.bonus as number | undefined, equity: data.equity as number | undefined, benefits: data.benefits_json as string[] | undefined,
    location: data.location as string | undefined, workType: data.work_type as string | undefined, stage: data.stage as string | undefined,
    offerDeadline: data.offer_deadline as string | undefined, createdAt: data.created_at as string, updatedAt: data.updated_at as string,
  };
}
