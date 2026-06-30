import { normalizeState } from "./reducer";
import type { ResumeIntent, ResumeState, ResumeWarning, ValidationIssue, ValidationResult } from "./types";

const PLACEHOLDER_PATTERNS = [
  /your phone number/i,
  /your linkedin/i,
  /your github/i,
  /your portfolio/i,
  /example@email\.com/i,
  /123-?456-?7890/i,
  /\banytown\b/i,
  /^n\/a$/i,
  /^unknown$/i,
];

const FAKE_ACHIEVEMENTS = [
  /AI Project Developer of the Year/i,
  /Project Developer of the Year/i,
  /increased .* by \d+%/i,
  /reduced .* by \d+%/i,
];

export function validateResumeTruthfulness(
  before: ResumeState | null,
  after: ResumeState,
  userMessage: string,
  mode: ResumeIntent,
): ValidationResult {
  const cleanedResume = normalizeState(after);
  const issues: ValidationIssue[] = [];
  const warnings: ResumeWarning[] = [];
  const sourceText = `${userMessage}\n${before ? resumeSourceText(before) : ""}`.toLowerCase();

  cleanCandidate(cleanedResume, issues);
  cleanSections(cleanedResume, issues);
  removeUnsupportedMetrics(cleanedResume, sourceText, issues);
  removeUnsupportedProjectTech(before, cleanedResume, userMessage, issues);
  removeFakeExperience(cleanedResume, userMessage, issues);
  removeGenericHallucinations(cleanedResume, issues);

  for (const issue of issues) {
    warnings.push({
      type: issue.type === "empty_section" ? "empty_section_removed" : issue.type === "placeholder_detected" ? "possible_hallucination" : "unsupported_claim",
      message: issue.message,
    });
  }
  cleanedResume.warnings = [...cleanedResume.warnings, ...warnings];
  cleanedResume.metadata.lastUserIntent = mode.type;

  return {
    isValid: !issues.some((issue) => !issue.autoFixed),
    issues,
    cleanedResume,
    warnings,
  };
}

export function removeUnsupportedPlaceholders(state: ResumeState): ResumeState {
  return validateResumeTruthfulness(null, state, "", {
    type: "GENERAL_HELP",
    confidence: 1,
    reason: "manual cleanup",
    needsLlm: false,
    needsCurrentResume: false,
    hasEnoughData: true,
  }).cleanedResume;
}

export function removeEmptySections(state: ResumeState): ResumeState {
  const cleaned = normalizeState(state);
  cleanSections(cleaned, []);
  return cleaned;
}

function cleanCandidate(state: ResumeState, issues: ValidationIssue[]) {
  for (const key of ["fullName", "email", "phone", "location", "linkedin", "github", "portfolio"] as const) {
    const value = state.candidate[key];
    if (!value) continue;
    if (isPlaceholder(value) || (key === "email" && /example\.com/i.test(value))) {
      delete state.candidate[key];
      issues.push(issue(String(key), "placeholder_detected", `Removed placeholder ${key}.`));
    }
    if ((key === "linkedin" || key === "github" || key === "portfolio") && /\/your|example\.com|github\.com\/name/i.test(value)) {
      delete state.candidate[key];
      issues.push(issue(String(key), "fake_url", `Removed unsupported ${key} URL.`));
    }
  }
}

function cleanSections(state: ResumeState, issues: ValidationIssue[]) {
  const beforeSkillGroups = Object.keys(state.skills).length;
  state.skills = Object.fromEntries(
    Object.entries(state.skills)
      .map(([key, value]) => [key, (value || []).filter((item) => !isPlaceholder(item))])
      .filter(([, value]) => Array.isArray(value) && value.length > 0),
  ) as ResumeState["skills"];
  if (beforeSkillGroups && !Object.keys(state.skills).length) {
    issues.push(issue("skills", "empty_section", "Removed empty skills section."));
  }

  state.projects = state.projects
    .filter((project) => project.name && !isPlaceholder(project.name))
    .map((project) => ({
      ...project,
      tech: project.tech?.filter((item) => !isPlaceholder(item)),
      bullets: project.bullets.filter((bullet) => bullet && !isPlaceholder(bullet)).slice(0, 3),
    }));
  state.experience = state.experience
    .filter((experience) => experience.company || experience.role || experience.bullets.length)
    .map((experience) => ({
      ...experience,
      startDate: isPlaceholder(experience.startDate || "") ? undefined : experience.startDate,
      endDate: isPlaceholder(experience.endDate || "") ? undefined : experience.endDate,
      bullets: experience.bullets.filter((bullet) => bullet && !isPlaceholder(bullet)),
    }));
  state.education = state.education.filter((education) => education.institution || education.degree || education.field || education.year || education.grade);
  state.certifications = state.certifications.filter((certification) => certification.name && !/^certification$/i.test(certification.name));
  state.achievements = state.achievements.filter((achievement) => achievement.text && !FAKE_ACHIEVEMENTS.some((pattern) => pattern.test(achievement.text)));
  state.languages = state.languages.filter((language) => language && !isPlaceholder(language));
}

function removeUnsupportedMetrics(state: ResumeState, sourceText: string, issues: ValidationIssue[]) {
  const metricPattern = /\b\d+(?:\.\d+)?%|\b\d{2,}\s+(?:users|customers|downloads|students|revenue|leads)\b/i;
  for (const section of [state.projects, state.experience]) {
    for (const item of section) {
      item.bullets = item.bullets.filter((bullet) => {
        const metric = bullet.match(metricPattern)?.[0];
        if (!metric) return true;
        const supported = sourceText.includes(metric.toLowerCase());
        if (!supported) issues.push(issue("bullets", "unsupported_metric", `Removed unsupported metric: ${metric}.`));
        return supported;
      });
    }
  }
}

function removeUnsupportedProjectTech(before: ResumeState | null, state: ResumeState, userMessage: string, issues: ValidationIssue[]) {
  const source = `${userMessage}\n${before ? resumeSourceText(before) : ""}`.toLowerCase();
  for (const project of state.projects) {
    if (!project.tech?.length) continue;
    const beforeProject = before?.projects.find((item) => item.name.toLowerCase() === project.name.toLowerCase());
    const supported = new Set((beforeProject?.tech || []).map((item) => item.toLowerCase()));
    project.tech = project.tech.filter((tech) => {
      const ok = supported.has(tech.toLowerCase()) || source.includes(tech.toLowerCase()) || source.includes(tech.toLowerCase().replace(".", " "));
      if (!ok) issues.push(issue("project.tech", "data_not_in_source", `Removed unsupported project tech ${tech} from ${project.name}.`));
      return ok;
    });
  }
}

function removeFakeExperience(state: ResumeState, userMessage: string, issues: ValidationIssue[]) {
  const source = userMessage.toLowerCase();
  state.experience = state.experience.filter((experience) => {
    const company = experience.company || "";
    if (/self[- ]taught|personal project/i.test(company) && !source.includes(company.toLowerCase())) {
      issues.push(issue("experience", "generic_hallucination", "Removed generic fake experience."));
      return false;
    }
    return true;
  });
}

function removeGenericHallucinations(state: ResumeState, issues: ValidationIssue[]) {
  const generic = [
    /applied theoretical knowledge to real-world problems/i,
    /enhancing creativity/i,
    /seamless user experience/i,
    /strong foundation in AI concepts/i,
  ];
  for (const section of [state.projects, state.experience]) {
    for (const item of section) {
      item.bullets = item.bullets.filter((bullet) => {
        const bad = generic.some((pattern) => pattern.test(bullet));
        if (bad) issues.push(issue("bullets", "generic_hallucination", "Removed generic unsupported bullet."));
        return !bad;
      });
    }
  }
}

function resumeSourceText(state: ResumeState) {
  return [
    state.candidate.fullName,
    state.candidate.email,
    state.candidate.phone,
    state.target.role,
    ...Object.values(state.skills).flatMap((items) => items || []),
    ...state.projects.flatMap((project) => [project.name, ...(project.tech || []), ...project.bullets]),
    ...state.experience.flatMap((experience) => [experience.company, experience.role, ...experience.bullets]),
    ...state.education.flatMap((education) => [education.institution, education.degree, education.field, education.year]),
    ...state.certifications.map((certification) => certification.name),
    ...state.achievements.map((achievement) => achievement.text),
  ].filter(Boolean).join("\n");
}

function isPlaceholder(value: string) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function issue(field: string, type: ValidationIssue["type"], message: string): ValidationIssue {
  return { field, type, message, autoFixed: true };
}
