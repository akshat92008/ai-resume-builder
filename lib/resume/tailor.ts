import { extractKnownSkills } from "./extract";
import type { ResumeState } from "./types";

export function tailorResumeToJob(resume: ResumeState, jobDescription: string): {
  resume: ResumeState;
  matchedKeywords: string[];
  missingKeywords: string[];
  warnings: string[];
} {
  const jdSkills = extractKnownSkills(jobDescription);
  const resumeSkills = Object.values(resume.skills).flatMap((items) => items || []);
  const matchedKeywords = jdSkills.filter((keyword) => resumeSkills.some((skill) => skill.toLowerCase() === keyword.toLowerCase()));
  const missingKeywords = jdSkills.filter((keyword) => !matchedKeywords.some((match) => match.toLowerCase() === keyword.toLowerCase()));
  const tailored: ResumeState = JSON.parse(JSON.stringify(resume));
  const jobTitle = jobDescription.match(/^\s*([^\n]{3,80}(?:intern|developer|engineer|designer|analyst)[^\n]*)/i)?.[1]?.trim();

  if (jobTitle) tailored.target.role = titleCase(jobTitle);
  tailored.target.jobDescription = jobDescription;
  tailored.summary = buildTailoredSummary(tailored, matchedKeywords);
  tailored.skills = Object.fromEntries(
    Object.entries(tailored.skills).map(([group, values]) => [
      group,
      reorder(values || [], matchedKeywords),
    ]).filter(([, values]) => (values as string[]).length > 0),
  ) as ResumeState["skills"];

  return {
    resume: tailored,
    matchedKeywords,
    missingKeywords,
    warnings: missingKeywords.map((keyword) => `The JD mentions ${keyword}, but your resume does not currently include it. I did not add it without confirmation.`),
  };
}

function buildTailoredSummary(resume: ResumeState, matched: string[]) {
  const role = resume.target.role || "target role";
  const proof = [
    resume.experience.length ? `${resume.experience.length} experience item${resume.experience.length > 1 ? "s" : ""}` : "",
    resume.projects.length ? `${resume.projects.length} project${resume.projects.length > 1 ? "s" : ""}` : "",
    matched.slice(0, 5).join(", "),
  ].filter(Boolean).join("; ");
  return `${resume.target.seniority ? titleCase(resume.target.seniority) : "Candidate"} targeting ${role}${proof ? ` with supported proof in ${proof}` : ""}.`;
}

function reorder(items: string[], keywords: string[]) {
  return [...items].sort((a, b) => score(b, keywords) - score(a, keywords));
}

function score(value: string, keywords: string[]) {
  return keywords.some((keyword) => keyword.toLowerCase() === value.toLowerCase()) ? 1 : 0;
}

function titleCase(value: string) {
  return value.trim().split(/\s+/).map((word) => {
    if (/^(UI|UX|AI|API|REST|CSS|HTML|SQL|AWS)$/i.test(word)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}
