/**
 * Shared utilities for Inngest intent handlers.
 * Extracted from the monolithic functions.ts to satisfy SRP.
 */

import {
  analyzeJobSearchPerformance,
  createResumeDocumentFromResume,
  legacyProfileToCareerProfile,
  mineAchievements,
  refreshCareerProfileInsights,
} from "@/lib/careerpath/career-os";
import type {
  CareerPathProfile,
  CareerPathResume,
  CareerWorkspaceState,
} from "@/lib/careerpath/types";

/** Maximum number of tracked job applications per resume workspace. */
export const MAX_TRACKED_APPLICATIONS = 50;

/** Maximum number of mined achievements to attach to a career profile. */
export const MAX_ACHIEVEMENTS = 12;

/**
 * Enriches a resume object with career profile insights, resume document,
 * job search analytics, and mined achievements.
 */
export function decorateResumeForCareerOS(
  resume: CareerPathResume,
  rawInput?: string,
  options?: { versionType?: "master" | "job_specific" },
) {
  const profile = refreshCareerProfileInsights(
    resume.careerProfile ||
      legacyProfileToCareerProfile(resume.profile, resume.userId, rawInput),
  );
  resume.careerProfile = profile;
  resume.resumeDocument = createResumeDocumentFromResume(
    resume,
    profile,
    options?.versionType ||
      (resume.jobDescription ? "job_specific" : "master"),
  );
  resume.jobSearchInsights =
    resume.jobSearchInsights ||
    analyzeJobSearchPerformance(resume.applications || [], [
      resume.resumeDocument,
    ]);
  const mining = mineAchievements(profile);
  if (mining.suggestedAchievements.length) {
    resume.careerProfile.achievements = [
      ...resume.careerProfile.achievements,
      ...mining.suggestedAchievements.filter(
        (item) =>
          !resume.careerProfile!.achievements.some(
            (existing) => existing.text === item.text,
          ),
      ),
    ].slice(0, MAX_ACHIEVEMENTS);
  }
}

/**
 * Creates an empty CareerPathProfile scaffold for a new user.
 */
export function emptyCareerPathProfile(userId: string): CareerPathProfile {
  return {
    id: crypto.randomUUID(),
    userId,
    personal: {},
    target: {
      role: "",
      industry: "",
      experienceLevel: "",
    },
    education: [],
    skills: {
      programming: [],
      frameworks: [],
      tools: [],
      databases: [],
      aiTools: [],
      softSkills: [],
    },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: "",
    confidenceNotes: [],
  };
}
