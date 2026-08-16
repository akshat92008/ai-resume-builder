/**
 * Career management intent handlers for the Inngest orchestrator.
 * Handles: GENERATE_APPLICATION_PACK, TRACK_JOB_APPLICATION, ANALYZE_JOB_SEARCH.
 */

import {
  analyzeJobSearchPerformance,
  buildCareerWorkspaceState,
  createJobApplicationFromCommand,
  extractJobDescription,
  generateApplicationPack,
} from "@/lib/careerpath/career-os";
import { auditResume, tailorResume } from "@/lib/careerpath/agents";
import { saveServerResume } from "@/lib/careerpath/db";
import { listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { decorateResumeForCareerOS, MAX_TRACKED_APPLICATIONS } from "./shared";
import { handleCreateResume } from "./resume-handlers";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function handleGenerateApplicationPack(message: string, currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  let resume = currentResume;
  if (!resume && message.length > 100) resume = (await handleCreateResume(message, userId, metadata)).resume;
  if (!resume) return { assistantMessage: "I need a resume or enough career details before I can prepare the full application pack. Paste your career info and the job description together.", resume: null, resumeId: null, missingFields: ["resume", "career profile"], workspace: buildCareerWorkspaceState(null) };

  const job = extractJobDescription(message || resume.jobDescription || "");
  if (message.length > 80) {
    const tailoring = tailorResume(resume, resume.profile, message);
    const finalAudit = auditResume(tailoring.tailoredResume, resume.targetRole, message);
    resume = { ...resume, content: tailoring.tailoredResume, tailoring, jobDescription: message, audit: finalAudit, score: finalAudit.score, version: resume.version + 1, updatedAt: new Date().toISOString() };
  }
  decorateResumeForCareerOS(resume, message, { versionType: "job_specific" });
  const pack = generateApplicationPack(resume.careerProfile!, resume, job);
  resume.applicationPack = pack;
  resume.jobSearchInsights = analyzeJobSearchPerformance(resume.applications || [], [resume.resumeDocument!]);
  await saveServerResume(resume, resume.userId);
  return { assistantMessage: `Application pack ready for ${job.title || resume.targetRole}. I generated a tailored resume, cover letter, recruiter DM, cold email, LinkedIn message, why-fit answer, and follow-up message.`, resume, resumeId: resume.id, versionCreated: true, workspace: buildCareerWorkspaceState(resume, message) };
}

export async function handleTrackJobApplication(message: string, currentResume: CareerPathResume | null, userId: string) {
  if (!currentResume) return { assistantMessage: "I can track applications after there is a resume in the workspace. Build or paste your resume details first, then say what job you applied to.", resume: null, resumeId: null, missingFields: ["resume"], workspace: buildCareerWorkspaceState(null) };
  decorateResumeForCareerOS(currentResume, message);
  const job = currentResume.jobDescription ? extractJobDescription(currentResume.jobDescription) : extractJobDescription(message);
  const application = createJobApplicationFromCommand(message, userId, currentResume, job);
  await saveJobApplication(application, userId);
  const applications = [application, ...(currentResume.applications || []).filter((item) => item.id !== application.id)].slice(0, MAX_TRACKED_APPLICATIONS);
  currentResume.applications = applications;
  currentResume.jobSearchInsights = analyzeJobSearchPerformance(applications, [currentResume.resumeDocument!]);
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume, currentResume.userId);
  return { assistantMessage: `Tracked ${application.company} — ${application.role} as ${application.status.replaceAll("_", " ")}. Next action: ${application.followUpAt ? "follow up in about 5 days if there is no reply" : "prepare the application pack before applying"}.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume, message) };
}

export async function handleAnalyzeJobSearch(currentResume: CareerPathResume | null) {
  if (!currentResume) return { assistantMessage: "I need tracked applications before I can analyze your job search. Start by tracking saved or applied jobs.", resume: null, resumeId: null, missingFields: ["tracked applications"], workspace: buildCareerWorkspaceState(null) };
  decorateResumeForCareerOS(currentResume);
  const applications = await listJobApplications(currentResume.userId);
  currentResume.applications = applications;
  const insights = analyzeJobSearchPerformance(applications, [currentResume.resumeDocument!]);
  currentResume.jobSearchInsights = insights;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume, currentResume.userId);
  return { assistantMessage: insights.map((item) => `• ${item.title}: ${item.suggestedAction}`).join("\n"), resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}
