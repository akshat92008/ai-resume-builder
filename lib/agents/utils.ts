import type { Project, ResumeContent, UserVault } from "@/lib/types";
import type { JobFitBand, ProjectHealthBand, ResumeQualityBand, ScoreBand } from "./types";

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function compact<T>(values: (T | null | undefined | false | "")[]): T[] {
  return values.filter(Boolean) as T[];
}

export function unique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function hasUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

export function hasAnyProjectProof(project: Project) {
  return hasUrl(project.github_url) || hasUrl(project.live_url) || hasUrl(project.case_study_url) || hasUrl(project.screenshots_url);
}

export function projectProofItems(project: Project) {
  return compact([
    hasUrl(project.github_url) ? { label: "GitHub", url: project.github_url, source: "project" as const } : null,
    hasUrl(project.live_url) ? { label: "Live demo", url: project.live_url, source: "project" as const } : null,
    hasUrl(project.case_study_url) ? { label: "Case study", url: project.case_study_url, source: "project" as const } : null,
    hasUrl(project.screenshots_url) ? { label: "Screenshots", url: project.screenshots_url, source: "project" as const } : null,
  ]);
}

export function profileProofItems(vault: UserVault) {
  return compact([
    hasUrl(vault.profile.github_url) ? { label: "GitHub profile", url: vault.profile.github_url, source: "profile" as const } : null,
    hasUrl(vault.profile.linkedin_url) ? { label: "LinkedIn profile", url: vault.profile.linkedin_url, source: "profile" as const } : null,
    hasUrl(vault.profile.portfolio_url) ? { label: "Portfolio", url: vault.profile.portfolio_url, source: "profile" as const } : null,
  ]);
}

export function isPlaceholderText(value?: string) {
  if (!value) return false;
  return /project added during onboarding|add details in career vault|i build things|demo@example\.com|lorem ipsum|placeholder|todo|fake company|fake internship|fake metric|\[|\]/i.test(value);
}

export function cleanText(value?: string) {
  if (!value || isPlaceholderText(value)) return "";
  return value.trim().replace(/\s+/g, " ");
}

export function cleanTitle(value: string) {
  return cleanText(value)
    .replace(/^([^a-zA-Z0-9]+)/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*an?\s+/i, " - ")
    .replace(/^[a-z]/, (match) => match.toUpperCase());
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "Recruiter-ready";
  if (score >= 65) return "Strong";
  if (score >= 40) return "Building";
  return "Weak";
}

export function projectHealthBand(score: number): ProjectHealthBand {
  if (score >= 85) return "Strong proof";
  if (score >= 65) return "Good";
  if (score >= 40) return "Needs detail";
  return "Too thin";
}

export function resumeQualityBand(score: number): ResumeQualityBand {
  if (score >= 85) return "Strong";
  if (score >= 65) return "Usable";
  if (score >= 40) return "Draft only";
  return "Not ready";
}

export function jobFitBand(score: number): JobFitBand {
  if (score >= 85) return "Strong fit";
  if (score >= 65) return "Good fit";
  if (score >= 40) return "Partial fit";
  return "Weak fit";
}

export function wordCount(value?: string) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

export function projectDisplayDescription(project: Project) {
  return cleanText(project.short_description) || cleanText(project.problem_solved) || "";
}

export function skillNamesFromVault(vault: UserVault) {
  return unique([
    ...vault.skills.map((skill) => skill.name),
    ...vault.projects.flatMap((project) => project.tech_stack),
  ]);
}

export function resumeText(content: ResumeContent) {
  return [
    content.header.name,
    content.header.email,
    content.header.phone,
    content.header.city,
    content.summary,
    ...content.skills.technical,
    ...content.skills.tools,
    ...content.skills.soft,
    ...content.projects.flatMap((project) => [project.title, project.description, ...project.techStack, ...project.bullets]),
    ...content.experience.flatMap((experience) => [experience.company, experience.role, ...experience.bullets]),
    ...content.education.flatMap((education) => [education.institution, education.degree, education.score]),
    ...content.certifications.flatMap((certificate) => [certificate.title, certificate.issuer]),
    ...(content.achievements ?? []).flatMap((achievement) => [achievement.title, achievement.description]),
  ].join(" ");
}
