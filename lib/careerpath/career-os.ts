/**
 * CareerOS — Career Operating System
 *
 * ⚠ THIS FILE IS NOW A BARREL RE-EXPORT.
 *
 * All business logic has been extracted into modular domain files under:
 *   lib/careerpath/domain/
 *
 * This file re-exports everything for backward compatibility.
 * Existing imports from "@/lib/careerpath/career-os" continue to work
 * with zero breaking changes.
 *
 * Domain modules:
 *   domain/utils.ts        — Shared utility functions
 *   domain/skills.ts       — Skill extraction and categorization
 *   domain/profile.ts      — Career profile creation, merging, insights
 *   domain/resume.ts       — Resume documents, smart versioning, mining
 *   domain/jobs.ts         — Job descriptions, intelligence, applications
 *   domain/analytics.ts    — Career health, search analysis, workspace state
 *   domain/achievements.ts — Achievement logging and preview
 *   domain/linkedin.ts     — LinkedIn optimization
 */

export {
  // Utils
  createId,
  sentenceCase,
  titleCase,
  escapeRegExp,
  splitList,
  unique,
  uniqueBy,
  clamp,
  addDaysIso,
  cleanEmpty,
  achievementItem,
  link,
  gap,
  insight,
  coachNote,
  section,
  bullet,
  command,
} from "./domain/utils";

export {
  // Skills
  extractKnownSkills,
  extractRoleKeywords,
  extractNiceToHaveSkills,
  mapSkillCategory,
  mapSkillSubcategory,
  evidenceForSkill,
  extractMetrics,
  extractLeadershipSignals,
  extractChallenges,
  extractLearnings,
  extractReferencedProjectNames,
  extractDocuments,
  extractHiddenExpectations,
  extractDreamCompanies,
  extractPreferredCountries,
  extractCoursework,
  extractAwards,
  extractActivities,
  inferIndustry,
} from "./domain/skills";

export {
  // Profile
  legacyProfileToCareerProfile,
  mergeCareerMemory,
  refreshCareerProfileInsights,
  detectCareerGaps,
  detectCareerStrengths,
  detectCareerWeaknesses,
} from "./domain/profile";

export {
  // Resume
  createResumeDocumentFromResume,
  generateSmartResumeVersions,
  mineAchievements,
  toReadinessScore,
  inferProofLevel,
} from "./domain/resume";

export {
  // Jobs
  extractJobDescription,
  analyzeJobIntelligence,
  generateApplicationPack,
  createJobApplicationFromCommand,
  routeCareerCommand,
} from "./domain/jobs";

export {
  // Analytics
  analyzeJobSearchPerformance,
  buildCareerHealth,
  generateCareerCoachNotes,
  buildCareerWorkspaceState,
} from "./domain/analytics";

export {
  // Achievements
  isAchievementLogInput,
  applyAchievementLog,
  previewAchievementLog,
} from "./domain/achievements";

export {
  // LinkedIn
  generateLinkedInOptimization,
} from "./domain/linkedin";
