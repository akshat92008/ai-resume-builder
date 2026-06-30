import { emptyResumeState, createResumeId } from "./types";
import type { ResumeState } from "./types";

export function applyResumeUpdate(
  currentResume: ResumeState | Partial<ResumeState> | null | undefined,
  update: Partial<ResumeState>,
  mode: "merge" | "replace_section" | "remove_section" | "tailor" | "improve",
): ResumeState {
  const current = normalizeState(currentResume);
  const next: ResumeState = JSON.parse(JSON.stringify(current));

  if (mode === "remove_section") {
    removeRequestedSections(next, update.metadata?.lastUserIntent || "");
    return stamp(next, update.metadata?.lastUserIntent);
  }

  next.candidate = { ...next.candidate, ...withoutEmpty(update.candidate || {}) };
  next.target = { ...next.target, ...withoutEmpty(update.target || {}) };
  next.summary = update.summary ?? next.summary;
  next.skills = mergeSkills(next.skills, update.skills || {});
  next.education = mergeBy(next.education, update.education || [], (item) => `${item.institution || ""}-${item.degree || ""}-${item.year || ""}`.toLowerCase());
  next.experience = mergeBy(next.experience, update.experience || [], (item) => `${item.company || ""}-${item.role || ""}`.toLowerCase(), true);
  next.projects = mergeBy(next.projects, update.projects || [], (item) => item.name.toLowerCase(), true);
  next.certifications = mergeBy(next.certifications, update.certifications || [], (item) => item.name.toLowerCase());
  next.achievements = mergeBy(next.achievements, update.achievements || [], (item) => item.text.toLowerCase());
  next.languages = unique([...(next.languages || []), ...(update.languages || [])]);
  next.missingFields = update.missingFields || next.missingFields || [];
  next.warnings = uniqueBy([...(next.warnings || []), ...(update.warnings || [])], (item) => item.message);

  if (mode === "improve") {
    next.summary = tightenSummary(next.summary);
    next.projects = next.projects.map((project) => ({
      ...project,
      bullets: project.bullets.map(strengthenBullet).slice(0, 3),
      sourceConfidence: project.sourceConfidence === "user_supplied" ? "rewritten_from_user" : project.sourceConfidence,
    }));
    next.experience = next.experience.map((experience) => ({
      ...experience,
      bullets: experience.bullets.map(strengthenBullet).slice(0, 4),
      sourceConfidence: experience.sourceConfidence === "user_supplied" ? "rewritten_from_user" : experience.sourceConfidence,
    }));
  }

  return stamp(next, update.metadata?.lastUserIntent);
}

export function normalizeState(input: ResumeState | Partial<ResumeState> | null | undefined): ResumeState {
  const base = emptyResumeState();
  if (!input) return base;
  return {
    ...base,
    ...input,
    candidate: { ...base.candidate, ...input.candidate },
    target: { ...base.target, ...input.target },
    skills: { ...base.skills, ...input.skills },
    experience: input.experience || [],
    projects: input.projects || [],
    education: input.education || [],
    certifications: input.certifications || [],
    achievements: input.achievements || [],
    languages: input.languages || [],
    missingFields: input.missingFields || [],
    warnings: input.warnings || [],
    metadata: { ...base.metadata, ...input.metadata },
  };
}

function mergeSkills(left: ResumeState["skills"], right: ResumeState["skills"]) {
  const next = { ...left };
  for (const [key, values] of Object.entries(right) as [keyof ResumeState["skills"], string[] | undefined][]) {
    if (!values?.length) continue;
    next[key] = unique([...(next[key] || []), ...values]);
  }
  return next;
}

function mergeBy<T extends { id?: string; bullets?: string[]; tech?: string[] }>(
  left: T[],
  right: T[],
  key: (item: T) => string,
  mergeArrays = false,
) {
  const next = [...left];
  for (const item of right) {
    const itemKey = key(item);
    const index = next.findIndex((existing) => key(existing) === itemKey && itemKey.replace(/-/g, ""));
    if (index === -1) {
      next.push({ ...item, id: item.id || createResumeId() });
      continue;
    }
    next[index] = {
      ...next[index],
      ...withoutEmpty(item),
      bullets: mergeArrays ? unique([...(next[index].bullets || []), ...(item.bullets || [])]) : item.bullets || next[index].bullets,
      tech: mergeArrays ? unique([...(next[index].tech || []), ...(item.tech || [])]) : item.tech || next[index].tech,
    };
  }
  return next;
}

function removeRequestedSections(state: ResumeState, command: string) {
  const text = command.toLowerCase();
  if (/internship|experience/.test(text)) state.experience = [];
  if (/project/.test(text)) state.projects = [];
  if (/certification/.test(text)) state.certifications = [];
  if (/achievement/.test(text)) state.achievements = [];
}

function strengthenBullet(bullet: string) {
  const clean = bullet.replace(/^[-*]\s*/, "").trim();
  if (!clean) return clean;
  if (/^(built|created|developed|designed|implemented|improved|fixed|collaborated|supported|used)\b/i.test(clean)) {
    return sentenceCase(clean);
  }
  return sentenceCase(`Worked on ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`);
}

function tightenSummary(summary?: string) {
  if (!summary) return summary;
  return summary.replace(/\b(dedicated and detail-oriented|passionate|hardworking|dynamic)\b/gi, "").replace(/\s+/g, " ").trim();
}

function stamp(state: ResumeState, intent?: string) {
  state.metadata.updatedAt = new Date().toISOString();
  if (intent) state.metadata.lastUserIntent = intent;
  return state;
}

function withoutEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0))) as Partial<T>;
}

function sentenceCase(value: string) {
  const clean = value.trim().replace(/[.!?]*$/, ".");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
