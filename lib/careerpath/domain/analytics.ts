/**
 * CareerOS — Analytics Domain
 *
 * Career health, job search analysis, coach notes, workspace state.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  CareerCoachNote,
  CareerHealth,
  CareerPathResume,
  CareerProfile,
  CareerWorkspaceState,
  JobApplication,
  JobIntelligenceReport,
  JobSearchInsight,
  ResumeDocument,
} from "../types";
import { coachNote, createId, insight, uniqueBy } from "./utils";
import { legacyProfileToCareerProfile, refreshCareerProfileInsights } from "./profile";
import { createResumeDocumentFromResume, generateSmartResumeVersions, mineAchievements } from "./resume";
import { analyzeJobIntelligence, extractJobDescription } from "./jobs";
import { generateLinkedInOptimization } from "./linkedin";
import { isAchievementLogInput, previewAchievementLog } from "./achievements";

// ---------------------------------------------------------------------------
// Job Search Performance Analysis
// ---------------------------------------------------------------------------

export function analyzeJobSearchPerformance(
  applications: JobApplication[],
  resumes: ResumeDocument[],
): JobSearchInsight[] {
  const insights: JobSearchInsight[] = [];
  const applied = applications.filter((item) => ["applied", "follow_up_needed", "interview", "rejected", "offer", "ghosted"].includes(item.status));
  const interviews = applications.filter((item) => item.status === "interview" || item.outcome?.gotInterview);
  const rejected = applications.filter((item) => item.status === "rejected" || item.outcome?.rejected);
  const avgProof = Math.round(resumes.reduce((sum, resume) => sum + (resume.score?.proofStrength || 0), 0) / Math.max(1, resumes.length));

  if (applied.length >= 5 && interviews.length === 0) {
    insights.push(insight("resume_issue", "Applications are not converting yet", `You have ${applied.length} applied roles and no interviews recorded. The resume may still be too generic or low-proof.`, "Tailor each resume to the job and add project links or proof details.", "high"));
  }
  if (avgProof > 0 && avgProof < 70) {
    insights.push(insight("proof_issue", "Proof strength is holding the resume back", "Several bullets still need links, metrics, technical detail, or clearer outcomes.", "Add GitHub/demo links and one confirmed result for your strongest project.", "high"));
  }
  if (applications.filter((item) => item.status === "saved").length > applied.length) {
    insights.push(insight("follow_up_issue", "Saved jobs are piling up", "You have more saved roles than submitted applications.", "Generate application packs for saved jobs and apply in batches.", "medium"));
  }
  if (interviews.length > 0 && rejected.length >= interviews.length) {
    insights.push(insight("positive_signal", "The resume is getting some attention", "You are reaching interviews, so the next bottleneck may be interview storytelling or technical preparation.", "Practice project walkthroughs and common role-specific questions.", "medium"));
  }
  if (!insights.length) {
    insights.push(insight("positive_signal", "Your job search loop is ready", "Start tracking applications so CareerPath AI can learn from outcomes.", "Apply with tailored versions and update statuses after each response.", "low"));
  }
  return insights;
}

// ---------------------------------------------------------------------------
// Career Health
// ---------------------------------------------------------------------------

export function buildCareerHealth(
  profile: CareerProfile,
  resume: CareerPathResume,
  applications: JobApplication[],
  insights: JobSearchInsight[],
): CareerHealth {
  const memorySignals = [
    Boolean(profile.personal.email || profile.personal.phone),
    profile.education.length > 0,
    profile.experience.length > 0,
    profile.projects.length > 0,
    profile.skills.length >= 5,
    profile.achievements.length > 0,
    profile.links.length > 0,
    profile.target.targetRoles.length > 0,
  ];
  const memoryCompleteness = Math.round((memorySignals.filter(Boolean).length / memorySignals.length) * 100);
  const resumeScore = resume.score?.overall || resume.resumeDocument?.score?.overall || 0;
  const skillGapCount = profile.gaps.filter((gapItem) => /skill|proof|impact|target/i.test(gapItem.area)).length;
  const recentActivity = [
    resume.updatedAt ? `Resume updated ${new Date(resume.updatedAt).toLocaleDateString("en-US")}` : "",
    applications[0] ? `${applications[0].company} application ${applications[0].status.replaceAll("_", " ")}` : "",
    insights[0]?.title || "",
  ].filter(Boolean);
  const latestDocuments = [
    resume.title,
    ...(profile.documents || []).slice(0, 4).map((document) => document.name),
  ].filter(Boolean);
  return {
    overall: Math.round((memoryCompleteness + resumeScore + Math.max(0, 100 - skillGapCount * 12)) / 3),
    memoryCompleteness,
    resumeScore,
    applicationCount: applications.length,
    skillGapCount,
    recentActivity,
    latestDocuments,
  };
}

// ---------------------------------------------------------------------------
// Career Coach Notes
// ---------------------------------------------------------------------------

export function generateCareerCoachNotes(
  profile: CareerProfile,
  resume: CareerPathResume,
  jobIntelligence: JobIntelligenceReport | null,
  insights: JobSearchInsight[],
): CareerCoachNote[] {
  const notes: CareerCoachNote[] = [];
  if (jobIntelligence?.missingSkills.length) {
    notes.push(coachNote(
      "Missing job keywords",
      `The job asks for ${jobIntelligence.missingSkills.slice(0, 3).join(", ")} and Career Memory does not prove them yet.`,
      "Add proof if you truly have it, or leave those keywords out of the tailored resume.",
      "high",
    ));
  }
  if (profile.weaknesses.some((item) => /Impact/.test(item.title))) {
    notes.push(coachNote(
      "Resume lacks quantified impact",
      "Several achievements still read as activity rather than outcome.",
      "Log results such as users, time saved, performance improved, or workflow changed.",
      "high",
    ));
  }
  if (!profile.links.some((item) => item.type === "github" || item.type === "portfolio" || item.type === "demo")) {
    notes.push(coachNote(
      "Proof links are thin",
      "Recruiters get less confidence when projects have no GitHub, demo, portfolio, or certificate link.",
      "Add at least one proof link to the strongest project.",
      "medium",
    ));
  }
  if ((resume.score?.overall || 0) >= 80 && profile.gaps.length <= 2) {
    notes.push(coachNote(
      "Ready for targeted applications",
      "Your resume score and memory completeness are strong enough to start applying selectively.",
      "Tailor the resume for each job and track every application outcome.",
      "medium",
    ));
  }
  for (const insightItem of insights.slice(0, 2)) {
    notes.push(coachNote(insightItem.title, insightItem.explanation, insightItem.suggestedAction, insightItem.priority));
  }
  if (!notes.length) {
    notes.push(coachNote(
      "Build the memory foundation",
      "CareerPath AI needs a little more career data before it can coach precisely.",
      "Add one project, one achievement, and your target role.",
      "low",
    ));
  }
  return uniqueBy(notes, (item) => item.title).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Workspace State Builder
// ---------------------------------------------------------------------------

export function buildCareerWorkspaceState(resume: CareerPathResume | null | undefined, rawInput?: string): CareerWorkspaceState {
  if (!resume) {
    return {
      careerProfile: null,
      mining: null,
      smartVersions: [],
      jobIntelligence: null,
      applicationPack: null,
      applications: [],
      insights: [],
      linkedInOptimization: null,
      careerHealth: null,
      coachNotes: [],
      achievementLog: null,
      jobDescription: null,
      command: null,
    };
  }
  const profile = refreshCareerProfileInsights(resume.careerProfile || legacyProfileToCareerProfile(resume.profile, resume.userId, rawInput));
  const resumeDocument = resume.resumeDocument || createResumeDocumentFromResume(resume, profile, resume.jobDescription ? "job_specific" : "master");
  const applications = resume.applications || [];
  const jobDescription = resume.jobDescription ? extractJobDescription(resume.jobDescription) : null;
  const jobIntelligence = jobDescription ? analyzeJobIntelligence(jobDescription, profile) : null;
  const insights = resume.jobSearchInsights || analyzeJobSearchPerformance(applications, [resumeDocument]);
  const mining = mineAchievements(profile);
  return {
    careerProfile: profile,
    mining,
    smartVersions: generateSmartResumeVersions(resume, profile),
    jobIntelligence,
    applicationPack: resume.applicationPack || null,
    applications,
    insights,
    linkedInOptimization: generateLinkedInOptimization(profile, resume, jobDescription || undefined),
    careerHealth: buildCareerHealth(profile, resume, applications, insights),
    coachNotes: generateCareerCoachNotes(profile, resume, jobIntelligence, insights),
    achievementLog: rawInput && isAchievementLogInput(rawInput) ? previewAchievementLog(profile, rawInput) : null,
    jobDescription,
    command: null,
  };
}
