import type { CareerPathResumeContent } from "./types";

type DurationSignal = {
  value: string;
  unit: "month" | "year";
  plus: boolean;
  raw: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function durationSignals(value: string): DurationSignal[] {
  const signals: DurationSignal[] = [];
  const pattern = /\b(\d+(?:\.\d+)?)\s*(\+)?\s*[- ]?\s*(years?|yrs?|months?|mos?)\b/gi;
  for (const match of value.matchAll(pattern)) {
    const unitToken = match[3].toLowerCase();
    signals.push({
      value: match[1],
      plus: Boolean(match[2]),
      unit: unitToken.startsWith("y") ? "year" : "month",
      raw: match[0],
    });
  }
  return signals;
}

function sourceSupportsDuration(signal: DurationSignal, sourceEvidence: string) {
  const unit = signal.unit === "year" ? "(?:years?|yrs?)" : "(?:months?|mos?)";
  const plus = signal.plus ? "\\s*\\+" : "\\s*\\+?";
  const matcher = new RegExp(`\\b${signal.value}${plus}\\s*[- ]?\\s*${unit}\\b`, "i");
  return matcher.test(sourceEvidence);
}

function splitSummary(summary: string) {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * Numeric token overlap is not enough for duration claims: "2-month internship"
 * cannot support "2+ years of experience". Remove a summary sentence whenever
 * its explicit month/year duration is not present in user-authored evidence with
 * the same unit and at least the same specificity.
 */
export function stripUnsupportedDurationClaims(
  content: CareerPathResumeContent,
  sourceEvidence: string,
): { content: CareerPathResumeContent; removedClaims: number } {
  let removedClaims = 0;
  const summary = splitSummary(content.summary).filter((sentence) => {
    const signals = durationSignals(sentence);
    if (!signals.length) return true;
    const supported = signals.every((signal) => sourceSupportsDuration(signal, sourceEvidence));
    if (!supported) removedClaims += 1;
    return supported;
  }).join(" ");

  return { content: { ...content, summary }, removedClaims };
}

const BULLET_STOPWORDS = new Set([
  "a", "an", "and", "the", "to", "of", "in", "on", "for", "with", "using", "used",
  "built", "build", "created", "create", "designed", "developed", "develop", "project",
  "called", "system", "application", "app", "enabling", "enables", "allows", "allow", "users",
  "user", "ease", "it", "this", "that",
]);

function cleanBulletToken(token: string) {
  // Keep meaningful internal punctuation in technologies such as node.js and
  // c++, but strip sentence punctuation that otherwise makes PostgreSQL and
  // PostgreSQL. look like different evidence tokens.
  return token.replace(/^[.%]+|[.%]+$/g, "");
}

function bulletTokens(value: string) {
  return [...new Set(
    normalize(value)
      .split(" ")
      .map(cleanBulletToken)
      .filter((token) => token.length >= 2 && !BULLET_STOPWORDS.has(token)),
  )];
}

function isNearDuplicate(a: string, b: string) {
  const left = bulletTokens(a);
  const right = bulletTokens(b);
  if (!left.length || !right.length) return normalize(a) === normalize(b);
  const rightSet = new Set(right);
  const intersection = left.filter((token) => rightSet.has(token)).length;
  const containment = intersection / Math.min(left.length, right.length);
  const union = new Set([...left, ...right]).size;
  const jaccard = union ? intersection / union : 0;
  return intersection >= 4 && (containment >= 0.72 || jaccard >= 0.62);
}

export function dedupeSemanticBullets(values: string[]) {
  const result: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (result.some((existing) => isNearDuplicate(existing, value))) continue;
    result.push(value);
  }
  return result;
}

/** Dedupe only within the same project/experience section. */
export function dedupeResumeSectionBullets(content: CareerPathResumeContent): CareerPathResumeContent {
  return {
    ...content,
    projects: content.projects.map((project) => ({
      ...project,
      bullets: dedupeSemanticBullets(project.bullets),
    })),
    experience: content.experience.map((experience) => ({
      ...experience,
      bullets: dedupeSemanticBullets(experience.bullets),
    })),
  };
}
