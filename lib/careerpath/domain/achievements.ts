/**
 * CareerOS — Achievements Domain
 *
 * Achievement logging, preview, and application.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  AchievementLoggerResult,
  CareerProfile,
} from "../types";
import { achievementItem, createId, escapeRegExp, sentenceCase, unique, uniqueBy } from "./utils";
import { extractMetrics } from "./skills";
import { refreshCareerProfileInsights } from "./profile";
import { inferProofLevel } from "./resume";

// ---------------------------------------------------------------------------
// Achievement Detection
// ---------------------------------------------------------------------------

export function isAchievementLogInput(input: string): boolean {
  return /\b(log|achievement|accomplished|today|shipped|launched|optimized|improved|reduced|increased|won|published|fixed|delivered)\b/i.test(input) &&
    /\b(built|made|created|optimized|improved|reduced|increased|won|published|fixed|delivered|launched|shipped|completed)\b/i.test(input);
}

// ---------------------------------------------------------------------------
// Achievement Application
// ---------------------------------------------------------------------------

export function applyAchievementLog(profile: CareerProfile, note: string): { profile: CareerProfile; result: AchievementLoggerResult } {
  const result = previewAchievementLog(profile, note);
  const linkedProjectNames = new Set(result.linkedProjectIds);
  const updatedProjects = profile.projects.map((project) => {
    if (!linkedProjectNames.has(project.id)) return project;
    return {
      ...project,
      achievements: uniqueBy([...project.achievements, result.achievement], (item) => item.text.toLowerCase()),
      metrics: unique([...(project.metrics || []), ...extractMetrics(note)]),
      tags: unique([...(project.tags || []), ...result.linkedSkills]).slice(0, 10),
    };
  });
  const rawInput = { id: createId(), content: note, source: "manual" as const, createdAt: new Date().toISOString() };
  const updatedProfile = refreshCareerProfileInsights({
    ...profile,
    projects: updatedProjects,
    achievements: uniqueBy([...profile.achievements, result.achievement], (item) => item.text.toLowerCase()),
    rawInputs: uniqueBy([...profile.rawInputs, rawInput], (item) => item.content),
    updatedAt: new Date().toISOString(),
  });
  return { profile: updatedProfile, result };
}

// ---------------------------------------------------------------------------
// Achievement Preview
// ---------------------------------------------------------------------------

export function previewAchievementLog(profile: CareerProfile, note: string): AchievementLoggerResult {
  const linkedSkills = profile.skills
    .filter((skill) => new RegExp(`\\b${escapeRegExp(skill.name)}\\b`, "i").test(note))
    .map((skill) => skill.name)
    .slice(0, 8);
  const linkedProjects = profile.projects.filter((project) => new RegExp(`\\b${escapeRegExp(project.name)}\\b`, "i").test(note));
  const context = linkedProjects[0]?.name || profile.experience.find((item) => new RegExp(`\\b${escapeRegExp(item.company)}\\b`, "i").test(note))?.company;
  const achievement = {
    ...achievementItem(stripAchievementPrefix(note), inferProofLevel(note), context),
    metric: extractMetrics(note)[0],
    impact: extractImpactPhrase(note),
  };
  const suggestedResumeBullet = professionalizeCareerBullet(achievement.text, profile.target.targetRoles[0] || profile.target.dreamRole || "target role");

  return {
    achievement,
    suggestedResumeBullet,
    linkedSkills,
    linkedProjectIds: linkedProjects.map((project) => project.id),
    memoryUpdates: [
      "Saved as a standalone achievement",
      linkedProjects.length ? `Linked to ${linkedProjects.map((project) => project.name).join(", ")}` : "Ready to link to a project or experience",
      linkedSkills.length ? `Linked skills: ${linkedSkills.join(", ")}` : "No existing skills matched yet",
      "Suggested a stronger resume bullet",
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers (Private)
// ---------------------------------------------------------------------------

function stripAchievementPrefix(note: string) {
  return note
    .replace(/^\s*(log\s+)?(achievement|accomplishment|today)\s*[:\-]?\s*/i, "")
    .trim();
}

function extractImpactPhrase(text: string) {
  return text.match(/\b(?:reduced|increased|improved|saved|grew|cut|boosted|optimized)[^\n.]{2,140}/i)?.[0];
}

function professionalizeCareerBullet(text: string, role: string) {
  const clean = stripAchievementPrefix(text).replace(/\s+/g, " ").trim();
  const startsWithAction = /^(built|created|developed|designed|implemented|improved|optimized|reduced|increased|launched|shipped|led|delivered|fixed)\b/i.test(clean);
  const actioned = startsWithAction ? clean : `Delivered ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  const suffix = /\b(for|using|with|to)\b/i.test(actioned) ? "" : ` for ${role.toLowerCase()} proof`;
  return sentenceCase(`${actioned}${suffix}`);
}
