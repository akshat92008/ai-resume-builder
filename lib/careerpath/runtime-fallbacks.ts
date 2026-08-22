import { extractKnownSkills } from "./domain/skills";
import type {
  CareerPathProfile,
  CareerPathResumeAudit,
  CareerPathResumeContent,
  CareerPathTailoringResult,
  HumanizedResume,
} from "./types";

const runtimeFallbackContents = new WeakSet<object>();

function markRuntimeFallback(content: CareerPathResumeContent): CareerPathResumeContent {
  runtimeFallbackContents.add(content);
  return content;
}

export function isRuntimeFallbackContent(content: CareerPathResumeContent) {
  return runtimeFallbackContents.has(content);
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractFallbackJobKeywords(text: string) {
  const supplemental = [
    /\bJava\b/i.test(text) ? "Java" : "",
  ].filter(Boolean);
  return unique([...extractKnownSkills(text), ...supplemental]);
}

function extractExperienceRequirement(text: string) {
  const match = text.match(/\b(\d+)\s*\+\s*years?\s+of\s+([^\n.]{3,120})/i)
    || text.match(/\b(?:at\s+least\s+)?(\d+)\s+years?\s+of\s+([^\n.]{3,120})/i);
  if (!match) return null;
  const years = Number(match[1]);
  if (!Number.isFinite(years) || years <= 0 || years > 50) return null;
  const area = match[2].replace(/\s+/g, " ").trim();
  return {
    years,
    label: `${years}+ years of ${area}`,
  };
}

function resumeExplicitlyMeetsExperienceRequirement(resumeText: string, requiredYears: number) {
  const explicitYears = [...resumeText.matchAll(/\b(\d+(?:\.\d+)?)\s*\+?\s*years?\b/gi)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  return explicitYears.some((years) => years >= requiredYears);
}

export function cloneResumeContent(content: CareerPathResumeContent): CareerPathResumeContent {
  return {
    ...content,
    header: {
      ...content.header,
      links: { ...content.header.links },
    },
    skills: content.skills.map((group) => ({ ...group, items: [...group.items] })),
    experience: content.experience.map((item) => ({ ...item, bullets: [...item.bullets] })),
    projects: content.projects.map((item) => ({ ...item, techStack: [...item.techStack], bullets: [...item.bullets] })),
    education: content.education.map((item) => ({ ...item })),
    certifications: content.certifications.map((item) => ({ ...item })),
    achievements: [...content.achievements],
    languages: [...content.languages],
  };
}

/**
 * Build a conservative resume directly from already source-gated Career Memory.
 * This is a reliability fallback, not a second generative system: it only copies
 * facts already present in the profile and is still passed through the canonical
 * truth/provenance verifier before persistence.
 */
export function fallbackResumeFromProfile(profile: CareerPathProfile): CareerPathResumeContent {
  const targetRole = profile.target.role?.trim();
  const firstExperience = profile.experience[0];
  const summaryParts = [
    firstExperience?.role ? `${firstExperience.role}${firstExperience.company ? ` at ${firstExperience.company}` : ""}` : "",
    targetRole ? `Targeting ${targetRole} roles` : "",
  ].filter(Boolean);

  const skillGroups: CareerPathResumeContent["skills"] = [];
  const addSkills = (category: string, items: string[]) => {
    const clean = unique(items);
    if (clean.length) skillGroups.push({ category, items: clean });
  };
  addSkills("Programming", profile.skills.programming);
  addSkills("Frameworks", profile.skills.frameworks);
  addSkills("Tools", profile.skills.tools);
  addSkills("Databases", profile.skills.databases);
  addSkills("AI Tools", profile.skills.aiTools);
  addSkills("Soft Skills", profile.skills.softSkills);

  return markRuntimeFallback({
    header: {
      name: profile.personal.name || "",
      email: profile.personal.email || "",
      phone: profile.personal.phone || "",
      location: profile.personal.location || "",
      links: {
        linkedin: profile.personal.linkedin || "",
        github: profile.personal.github || "",
        portfolio: profile.personal.portfolio || "",
      },
    },
    summary: summaryParts.join(". ") + (summaryParts.length ? "." : ""),
    skills: skillGroups,
    experience: profile.experience.map((item) => ({
      company: item.company,
      role: item.role,
      dates: [item.startDate, item.endDate].filter(Boolean).join(" – "),
      bullets: unique([...item.responsibilities, ...item.achievements]),
    })),
    projects: profile.projects.map((item) => ({
      name: item.name,
      techStack: unique(item.techStack),
      link: item.links[0] || "",
      bullets: unique([
        item.description,
        item.problemSolved,
        ...item.features,
        item.impact,
      ].filter(Boolean)),
    })),
    education: profile.education.map((item) => ({
      institution: item.institution,
      degree: [item.degree, item.field].filter(Boolean).join(" — "),
      dates: [item.startYear, item.endYear].filter(Boolean).join(" – "),
      score: item.score || "",
      location: item.location || "",
    })),
    certifications: profile.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer || "",
      date: item.date || "",
      link: item.credentialLink || "",
    })),
    achievements: unique(profile.achievements),
    languages: unique(profile.languages),
  });
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** A deterministic operational audit used only when the external model is unavailable. */
export function fallbackResumeAudit(
  content: CareerPathResumeContent,
  targetRole = "",
  jobDescription = "",
): CareerPathResumeAudit {
  const text = JSON.stringify(content);
  const sectionCount = [
    content.summary,
    content.skills.length,
    content.experience.length,
    content.projects.length,
    content.education.length,
  ].filter(Boolean).length;
  const bullets = [
    ...content.experience.flatMap((item) => item.bullets),
    ...content.projects.flatMap((item) => item.bullets),
    ...content.achievements,
  ];
  const numericBullets = bullets.filter((item) => /\d/.test(item)).length;
  const jdSkills = extractKnownSkills(jobDescription);
  const resumeSkills = new Set(extractKnownSkills(text).map(normalize));
  const matched = jdSkills.filter((skill) => resumeSkills.has(normalize(skill))).length;
  const keywordCoverage = jdSkills.length ? (matched / jdSkills.length) * 100 : (content.skills.length ? 70 : 35);
  const completeness = clampScore(35 + sectionCount * 10 + Math.min(15, bullets.length * 2));
  const proof = clampScore(45 + Math.min(35, numericBullets * 10) + (bullets.length ? 10 : 0));
  const roleAlignment = targetRole && normalize(text).includes(normalize(targetRole)) ? 85 : targetRole ? 60 : 50;
  const overall = clampScore((completeness + proof + keywordCoverage + roleAlignment) / 4);

  return {
    score: {
      overall,
      atsCompatibility: completeness,
      roleAlignment: clampScore(roleAlignment),
      keywordCoverage: clampScore(keywordCoverage),
      bulletStrength: clampScore(bullets.length ? 70 : 35),
      clarity: 75,
      proofAndMetrics: proof,
      onePageFit: 80,
      formattingSafety: 95,
      truthfulness: 100,
      impactScore: proof,
      readability: 80,
      leadership: 50,
    },
    topStrengths: [
      ...(content.skills.length ? ["Structured skills section is present."] : []),
      ...(bullets.length ? ["Resume includes source-backed evidence bullets."] : []),
    ],
    weaknesses: [
      ...(!bullets.length ? ["Add more source-backed evidence bullets when available."] : []),
      ...(jdSkills.length && matched < jdSkills.length ? ["Some job-description skills are not present in Career Memory."] : []),
    ],
    probabilityOfInterview: overall >= 80 ? "High" : overall >= 55 ? "Medium" : "Low",
    recruiterComments: "Deterministic fallback audit used because the external audit model was unavailable.",
    issues: [],
    recommendedFixes: [],
    summary: "Fallback audit completed without adding or changing resume facts.",
  };
}

export function fallbackImproveResume(content: CareerPathResumeContent): CareerPathResumeContent {
  return markRuntimeFallback(cloneResumeContent(content));
}

export function fallbackTailorResume(
  content: CareerPathResumeContent,
  jobDescription: string,
): CareerPathTailoringResult {
  const resumeText = JSON.stringify(content);
  const resumeSkills = new Set(extractFallbackJobKeywords(resumeText).map(normalize));
  const jdSkills = extractFallbackJobKeywords(jobDescription);
  const matchedKeywords = jdSkills.filter((skill) => resumeSkills.has(normalize(skill)));
  const missingKeywordsNotAdded = jdSkills.filter((skill) => !resumeSkills.has(normalize(skill)));

  const experienceRequirement = extractExperienceRequirement(jobDescription);
  if (experienceRequirement) {
    if (resumeExplicitlyMeetsExperienceRequirement(resumeText, experienceRequirement.years)) {
      matchedKeywords.push(experienceRequirement.label);
    } else {
      missingKeywordsNotAdded.push(experienceRequirement.label);
    }
  }

  const signalCount = matchedKeywords.length + missingKeywordsNotAdded.length;
  const matchScore = signalCount ? Math.round((matchedKeywords.length / signalCount) * 100) : 70;
  return {
    matchScore,
    matchedKeywords: unique(matchedKeywords),
    safeKeywordsAdded: [],
    missingKeywordsNotAdded: unique(missingKeywordsNotAdded),
    tailoringSummary: ["External tailoring model was unavailable; preserved the verified resume without inventing missing keywords or experience."],
    tailoredResume: markRuntimeFallback(cloneResumeContent(content)),
  };
}

export function fallbackHumanizedResume(content: CareerPathResumeContent): HumanizedResume {
  return {
    content: markRuntimeFallback(cloneResumeContent(content)),
    changes: [],
    clisheesRemoved: [],
    summary: "External humanization model was unavailable; preserved the verified wording and factual content unchanged.",
  };
}
