/**
 * CareerOS — Shared Utility Functions
 *
 * Pure helper functions used across all domain modules.
 * Extracted from career-os.ts for maintainability.
 */

import type { AchievementItem, CareerCoachNote, CareerGap, JobSearchInsight, ProofLevel, ResumeBullet, ResumeDocument } from "../types";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// String Utilities
// ---------------------------------------------------------------------------

export function sentenceCase(value: string) {
  const clean = value.trim().replace(/[.!?]*$/, ".");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

export function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 && /^[A-Z0-9.+#-]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitList(value: string) {
  return unique(value.split(/,|;|\||\band\b/i).map((item) => titleCase(item.trim())).filter(Boolean));
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

// ---------------------------------------------------------------------------
// Math / Date Utilities
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Object Utilities
// ---------------------------------------------------------------------------

export function cleanEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "" && item !== null)) as Partial<T>;
}

// ---------------------------------------------------------------------------
// Domain Factory Functions
// ---------------------------------------------------------------------------

export function achievementItem(text: string, proofLevel: ProofLevel, context?: string): AchievementItem {
  return {
    id: createId(),
    text: sentenceCase(text),
    context,
    proofLevel,
  };
}

export function link(label: string, url: string, type: NonNullable<import("../types").LinkItem["type"]>) {
  return { id: createId(), label, url, type };
}

export function gap(area: string, question: string, importance: CareerGap["importance"]): CareerGap {
  return { id: createId(), area, question, importance, status: "open" };
}

export function insight(type: JobSearchInsight["type"], title: string, explanation: string, suggestedAction: string, priority: JobSearchInsight["priority"]): JobSearchInsight {
  return { id: createId(), type, title, explanation, suggestedAction, priority };
}

export function coachNote(title: string, message: string, action: string, priority: CareerCoachNote["priority"]): CareerCoachNote {
  return { id: createId(), title, message, action, priority };
}

export function section(type: ResumeDocument["sections"][number]["type"], title: string, order: number, content: unknown) {
  return { id: createId(), type, title, order, content };
}

export function bullet(text: string, sourceType: ResumeBullet["sourceType"], sourceId: string | undefined, proofLevel: ProofLevel): ResumeBullet {
  return {
    id: createId(),
    text,
    sourceType,
    sourceId,
    proofLevel,
    riskFlags: proofLevel === "weak" || proofLevel === "risky" ? ["Needs proof: add metric, link, result, or technical detail."] : [],
  };
}

export function command(
  intent: import("../types").CareerCommandResult["intent"],
  shouldGenerateResume: boolean,
  shouldTailor: boolean,
  shouldGenerateApplicationPack: boolean,
  shouldTrackApplication: boolean,
  shouldAnalyzeSearch: boolean,
  suggestedResponse: string,
  shouldLogAchievement = false,
): import("../types").CareerCommandResult {
  return { intent, shouldGenerateResume, shouldTailor, shouldGenerateApplicationPack, shouldTrackApplication, shouldAnalyzeSearch, shouldLogAchievement, suggestedResponse };
}
