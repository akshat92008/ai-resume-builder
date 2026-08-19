import type { CareerPathResumeContent, CareerProfile, ExperienceItem, ProjectItem } from "@/lib/careerpath/types";

export type ClaimProvenanceEntry = {
  section: "summary" | "skill" | "experience" | "project" | "achievement";
  item: string;
  claim: string;
  sourceId?: string;
  supported: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
};

export type ClaimProvenanceReport = {
  entries: ClaimProvenanceEntry[];
  removedClaims: number;
  supportedClaims: number;
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "that", "this", "using", "used", "built", "created", "developed", "implemented", "designed", "delivered", "worked", "role", "team", "project", "application", "system", "user", "users", "through", "across", "while", "which", "their", "your", "our", "was", "were", "are", "is", "to", "of", "in", "on", "a", "an",
]);

const MATERIAL_OUTCOME_STEMS = [
  "accelerat", "boost", "cut", "decreas", "deliver", "drove", "driv", "enhanc",
  "grew", "grow", "improv", "increas", "lead", "led", "optimiz", "own", "rais",
  "reduc", "sav", "scale", "streamlin", "transform", "automat",
];

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claimTokens(value: string) {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d/.test(token)))];
}

function numericSignals(value: string) {
  // Do not use a trailing word boundary here: `%` is not a word character, so
  // `/\b...%?\b/` silently turned `900%` into `900`. Keeping the unit matters
  // because `9`, `9%`, and `900%` are materially different factual claims.
  return [...new Set(normalize(value).match(/\d+(?:\.\d+)?%?/g) || [])];
}

function materialOutcomeSignals(value: string) {
  const tokens = normalize(value).split(" ");
  return [...new Set(MATERIAL_OUTCOME_STEMS.filter((stem) => tokens.some((token) => token.startsWith(stem))))];
}

function sourceHasStem(sourceText: string, stem: string) {
  return sourceText.split(" ").some((token) => token.startsWith(stem));
}

function sourceTextForProject(item: ProjectItem) {
  return normalize([
    item.name,
    item.description,
    item.problem,
    item.solution,
    item.role,
    ...item.technologies,
    ...(item.metrics || []),
    ...item.achievements.flatMap((achievement) => [achievement.text, achievement.metric, achievement.context, achievement.impact, achievement.evidence]),
    ...(item.challenges || []),
    ...(item.learnings || []),
  ].filter(Boolean).join(" "));
}

function sourceTextForExperience(item: ExperienceItem) {
  return normalize([
    item.company,
    item.title,
    item.description,
    ...item.responsibilities,
    ...item.technologies,
    ...(item.metrics || []),
    ...(item.leadership || []),
    ...(item.businessImpact || []),
    ...item.achievements.flatMap((achievement) => [achievement.text, achievement.metric, achievement.context, achievement.impact, achievement.evidence]),
  ].filter(Boolean).join(" "));
}

function sourceTextForProfile(profile: CareerProfile) {
  return normalize([
    profile.personal?.fullName,
    ...(profile.target?.targetRoles || []),
    ...profile.education.flatMap((item) => Object.values(item).filter((value) => typeof value === "string")),
    ...profile.experience.map(sourceTextForExperience),
    ...profile.projects.map(sourceTextForProject),
    ...profile.skills.flatMap((item) => [item.name, item.category, ...(item.evidence || [])]),
    ...profile.certifications.flatMap((item) => Object.values(item).filter((value) => typeof value === "string")),
    ...profile.achievements.flatMap((item) => [item.text, item.metric, item.context, item.impact, item.evidence]),
  ].filter(Boolean).join(" "));
}

function assessClaim(claim: string, sourceText: string, minimumOverlap = 0.45) {
  const reasons: string[] = [];
  const numbers = numericSignals(claim);
  const unsupportedNumbers = numbers.filter((number) => !sourceText.includes(number));
  if (unsupportedNumbers.length) reasons.push(`Unsupported numeric signal${unsupportedNumbers.length === 1 ? "" : "s"}: ${unsupportedNumbers.join(", ")}`);

  const outcomeSignals = materialOutcomeSignals(claim);
  const unsupportedOutcomes = outcomeSignals.filter((stem) => !sourceHasStem(sourceText, stem));
  if (unsupportedOutcomes.length) {
    reasons.push(`Unsupported outcome/ownership signal${unsupportedOutcomes.length === 1 ? "" : "s"}: ${unsupportedOutcomes.join(", ")}`);
  }

  const tokens = claimTokens(claim);
  const matched = tokens.filter((token) => sourceText.includes(token));
  const overlap = tokens.length ? matched.length / tokens.length : 1;
  if (tokens.length >= 3 && overlap < minimumOverlap) reasons.push(`Low evidence-token overlap (${Math.round(overlap * 100)}%).`);

  const supported = unsupportedNumbers.length === 0
    && unsupportedOutcomes.length === 0
    && (tokens.length < 3 || overlap >= minimumOverlap);
  const confidence: "high" | "medium" | "low" = !supported ? "low" : overlap >= 0.7 ? "high" : "medium";
  return { supported, confidence, reasons };
}

function matchProject(profile: CareerProfile, name: string) {
  const target = normalize(name);
  return profile.projects.find((item) => normalize(item.name) === target)
    || profile.projects.find((item) => target.includes(normalize(item.name)) || normalize(item.name).includes(target));
}

function matchExperience(profile: CareerProfile, company: string, role: string) {
  const companyTarget = normalize(company);
  const roleTarget = normalize(role);
  return profile.experience.find((item) => normalize(item.company) === companyTarget && (!roleTarget || normalize(item.title) === roleTarget))
    || profile.experience.find((item) => normalize(item.company) === companyTarget)
    || profile.experience.find((item) => roleTarget && normalize(item.title) === roleTarget);
}

function sentenceClaims(summary: string) {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function enforceResumeClaimProvenance(content: CareerPathResumeContent, profile: CareerProfile) {
  const entries: ClaimProvenanceEntry[] = [];
  const profileSource = sourceTextForProfile(profile);

  const summarySentences = sentenceClaims(content.summary);
  const supportedSummary = summarySentences.filter((claim) => {
    const assessment = assessClaim(claim, profileSource, 0.35);
    entries.push({ section: "summary", item: "Professional summary", claim, ...assessment });
    return assessment.supported;
  });
  const summary = supportedSummary.join(" ");

  const skills = content.skills
    .map((group) => ({
      ...group,
      items: group.items.filter((skill) => {
        const normalizedSkill = normalize(skill);
        const supported = Boolean(normalizedSkill) && profileSource.includes(normalizedSkill);
        entries.push({
          section: "skill",
          item: group.category,
          claim: skill,
          supported,
          confidence: supported ? "high" : "low",
          reasons: supported ? [] : ["Skill is not represented in Career Memory evidence."],
        });
        return supported;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const experience = content.experience.map((item) => {
    const source = matchExperience(profile, item.company, item.role);
    const sourceText = source ? sourceTextForExperience(source) : "";
    const bullets = item.bullets.filter((claim) => {
      const assessment = source ? assessClaim(claim, sourceText) : { supported: false, confidence: "low" as const, reasons: ["No matching Career Memory experience source."] };
      entries.push({ section: "experience", item: `${item.role} @ ${item.company}`, claim, sourceId: source?.id, ...assessment });
      return assessment.supported;
    });
    return { ...item, bullets };
  });

  const projects = content.projects.map((item) => {
    const source = matchProject(profile, item.name);
    const sourceText = source ? sourceTextForProject(source) : "";
    const bullets = item.bullets.filter((claim) => {
      const assessment = source ? assessClaim(claim, sourceText) : { supported: false, confidence: "low" as const, reasons: ["No matching Career Memory project source."] };
      entries.push({ section: "project", item: item.name, claim, sourceId: source?.id, ...assessment });
      return assessment.supported;
    });
    return { ...item, bullets };
  });

  const achievementSource = normalize(profile.achievements.flatMap((item) => [item.text, item.metric, item.context, item.impact, item.evidence]).filter(Boolean).join(" "));
  const achievements = content.achievements.filter((claim) => {
    const assessment = achievementSource
      ? assessClaim(claim, achievementSource)
      : { supported: false, confidence: "low" as const, reasons: ["No matching Career Memory achievement source."] };
    entries.push({ section: "achievement", item: "Achievement", claim, ...assessment });
    return assessment.supported;
  });

  const report: ClaimProvenanceReport = {
    entries,
    removedClaims: entries.filter((entry) => !entry.supported).length,
    supportedClaims: entries.filter((entry) => entry.supported).length,
  };

  return {
    content: { ...content, summary, skills, experience, projects, achievements },
    report,
  };
}
