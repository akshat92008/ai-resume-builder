/**
 * CareerPath AI — Shared Text & Array Utilities
 *
 * Low-level helpers used across parser, evaluator, and generator modules.
 * Extracted from agents.ts to satisfy the Single Responsibility Principle.
 */

import type { CareerPathResumeContent, CareerPathProfile } from "./types";

// ---------------------------------------------------------------------------
// String Utilities
// ---------------------------------------------------------------------------

export function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 && /^[A-Z0-9.+#-]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

export function sentenceCase(value: string) {
  const clean = value.trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.!?]*$/, ".") : clean;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeSkillName(value: string) {
  const lower = value.toLowerCase().replace(/\s+/g, " ");
  if (/next/.test(lower)) return "Next.js";
  if (/node/.test(lower)) return "Node.js";
  if (/tailwind/.test(lower)) return "Tailwind CSS";
  if (/full/.test(lower)) return "Full Stack";
  return titleCase(value);
}

// ---------------------------------------------------------------------------
// Numeric Utilities
// ---------------------------------------------------------------------------

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Array Utilities
// ---------------------------------------------------------------------------

export function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function reorderByKeywords(items: string[], keywords: string[]) {
  return [...items].sort((a, b) => scoreKeyword(b, keywords) - scoreKeyword(a, keywords));
}

export function scoreKeyword(value: string, keywords: string[]) {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase())) ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Object Utilities
// ---------------------------------------------------------------------------

export function cloneProfile(profile: CareerPathProfile) {
  return JSON.parse(JSON.stringify(profile)) as CareerPathProfile;
}

export function upsertProfileItem<T>(items: T[], item: T, key: (item: T) => string) {
  const itemKey = key(item);
  const existingIndex = items.findIndex((existing) => key(existing) === itemKey);
  if (existingIndex >= 0) {
    items[existingIndex] = mergeObjects(items[existingIndex], item);
  } else {
    items.push(item);
  }
}

export function mergeObjects<T>(left: T, right: T): T {
  const merged: Record<string, unknown> = { ...(left as Record<string, unknown>) };
  for (const [key, value] of Object.entries(right as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] as string[] : []), ...value]);
    } else if (value) {
      merged[key] = value;
    }
  }
  return merged as T;
}

// ---------------------------------------------------------------------------
// Resume Text Serialization
// ---------------------------------------------------------------------------

export function resumeToText(content: CareerPathResumeContent) {
  return [
    content.header.name,
    content.header.email,
    content.header.phone,
    content.header.location,
    content.summary,
    ...content.skills.flatMap((group) => [group.category, ...group.items]),
    ...content.projects.flatMap((project) => [project.name, ...project.techStack, ...project.bullets]),
    ...content.experience.flatMap((experience) => [experience.company, experience.role, ...experience.bullets]),
    ...content.education.flatMap((education) => [education.institution, education.degree, education.score ?? ""]),
    ...content.certifications.flatMap((certification) => [certification.name, certification.issuer ?? ""]),
    ...content.achievements,
    ...content.languages,
  ]
    .filter(Boolean)
    .join("\n");
}
