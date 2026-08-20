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
import { tailorResume } from "@/lib/careerpath/agents";
import { saveServerResume } from "@/lib/careerpath/db";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { listJobApplications, saveJobApplication } from "@/lib/careerpath/db-jobs";
import { analyzeCareerLoopJob, buildConversionIntelligence, inferJobSource } from "@/lib/careerloop";
import type { CareerLoopJobApplication } from "@/lib/careerloop";
import { decorateResumeForCareerOS, MAX_TRACKED_APPLICATIONS } from "./shared";
import { handleCreateResume } from "./resume-handlers";
import type { CareerPathResume } from "@/lib/careerpath/types";

export async function handleGenerateApplicationPack(message: string, currentResume: CareerPathResume | null, userId: string, metadata: { userId: string; resumeId?: string }) {
  let resume = currentResume;
  if (!resume && message.length > 100) resume = (await handleCreateResume(message, userId, metadata)).resume;
  if (!resume) return { assistantMessage: "I need a resume or enough career details before I can prepare the full application pack. Paste your career info and the job description together.", resume: null, resumeId: null, missingFields: ["resume", "career profile"], workspace: buildCareerWorkspaceState(null) };

  const expectedVersion = resume.version;
  const job = extractJobDescription(message || resume.jobDescription || "");
  if (message.length > 80) {
    const tailoring = tailorResume(resume, resume.profile, message);
    const verified = await verifyResumeCandidate({
      content: tailoring.tailoredResume,
      currentResume: resume,
      userId,
      legacyProfile: resume.profile || null,
      careerProfile: resume.careerProfile || null,
      instruction: message,
      mode: "tailor",
      targetRole: resume.targetRole,
      jobDescription: message,
      metadata,
    });
    resume = {
      ...resume,
      content: verified.content,
      careerProfile: verified.careerProfile,
      tailoring: { ...tailoring, tailoredResume: verified.content },
      jobDescription: message,
      audit: verified.audit,
      score: verified.score,
    };
  }
  decorateResumeForCareerOS(resume, message, { versionType: "job_specific" });
  const pack = generateApplicationPack(resume.careerProfile!, resume, job);
  resume.applicationPack = pack;
  resume.jobSearchInsights = analyzeJobSearchPerformance(resume.applications || [], [resume.resumeDocument!]);
  resume.version = expectedVersion + 1;
  resume.updatedAt = new Date().toISOString();
  await saveServerResume(resume, resume.userId, { expectedVersion });
  return { assistantMessage: `Application pack ready for ${job.title || resume.targetRole}. I generated a verified tailored resume, cover letter, recruiter DM, cold email, LinkedIn message, why-fit answer, and follow-up message.`, resume, resumeId: resume.id, versionCreated: true, workspace: buildCareerWorkspaceState(resume, message) };
}

export async function handleTrackJobApplication(message: string, currentResume: CareerPathResume | null, userId: string) {
  if (!currentResume) return { assistantMessage: "I can track applications after there is a resume in the workspace. Build or paste your resume details first, then say what job you applied to.", resume: null, resumeId: null, missingFields: ["resume"], workspace: buildCareerWorkspaceState(null) };
  decorateResumeForCareerOS(currentResume, message);
  const job = currentResume.jobDescription ? extractJobDescription(currentResume.jobDescription) : extractJobDescription(message);
  const baseApplication = createJobApplicationFromCommand(message, userId, currentResume, job);
  const intelligence = currentResume.careerProfile ? analyzeCareerLoopJob(job, currentResume.careerProfile) : null;
  const application: CareerLoopJobApplication = {
    ...baseApplication,
    resumeVersion: currentResume.version,
    source: inferJobSource(baseApplication.jobUrl),
    fitScore: intelligence?.fitPercentage,
    fitRecommendation: intelligence?.recommendation,
  };

  // job_applications is the canonical store for tracked jobs. Do not perform a
  // second resume-row write after this insert: if that CAS conflicted, the API
  // could report failure even though the job was already durably tracked, and a
  // retry could create a duplicate. App-state reloads canonical jobs and attaches
  // them to the resume on every request.
  await saveJobApplication(application, userId);
  const applications = [application, ...(currentResume.applications || []).filter((item) => item.id !== application.id)].slice(0, MAX_TRACKED_APPLICATIONS);
  currentResume.applications = applications;
  currentResume.jobSearchInsights = analyzeJobSearchPerformance(applications, [currentResume.resumeDocument!]);

  const fit = intelligence ? ` CareerLoop rated the role ${intelligence.fitPercentage}% fit (${intelligence.recommendation.toUpperCase()}).` : "";
  return { assistantMessage: `Tracked ${application.company} — ${application.role} as ${application.status.replaceAll("_", " ")}.${fit} Next action: ${application.followUpAt ? "follow up in about 5 days if there is no reply" : "prepare the application pack before applying"}.`, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume, message) };
}

export async function handleAnalyzeJobSearch(currentResume: CareerPathResume | null) {
  if (!currentResume) return { assistantMessage: "I need tracked applications before I can analyze your job search. Start by tracking saved or applied jobs.", resume: null, resumeId: null, missingFields: ["tracked applications"], workspace: buildCareerWorkspaceState(null) };
  const expectedVersion = currentResume.version;
  decorateResumeForCareerOS(currentResume);
  const applications = await listJobApplications(currentResume.userId);
  currentResume.applications = applications;
  const insights = analyzeJobSearchPerformance(applications, [currentResume.resumeDocument!]);
  const conversion = buildConversionIntelligence(applications);
  currentResume.jobSearchInsights = insights;
  currentResume.version = expectedVersion + 1;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume, currentResume.userId, { expectedVersion });
  const strategy = conversion.recommendations.slice(0, 3).map((item) => `• ${item.title}: ${item.action}`).join("\n");
  const assistantMessage = `Your application → interview conversion is ${conversion.northStar.interviewRate}% (${conversion.northStar.interviews}/${conversion.northStar.applications}).\n${strategy}`;
  return { assistantMessage, resume: currentResume, resumeId: currentResume.id, workspace: buildCareerWorkspaceState(currentResume) };
}
