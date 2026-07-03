/**
 * CareerPath AI — Resume Generator
 *
 * Handles resume writing, improvement, tailoring, and record creation.
 * Extracted from agents.ts to satisfy the Single Responsibility Principle.
 */

import type {
  BuilderMode,
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeAudit,
  CareerPathResumeContent,
  CareerPathTailoringResult,
} from "./types";
import { unique, sentenceCase, reorderByKeywords, clampScore, resumeToText } from "./text-utils";
import { extractTargetRole, targetKeywords } from "./parser";
import { auditResume } from "./evaluator";

// ---------------------------------------------------------------------------
// UUID generator (re-exported from agents.ts for backward compat)
// ---------------------------------------------------------------------------

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Resume Writer
// ---------------------------------------------------------------------------

export function writeResume(profile: CareerPathProfile, mode: BuilderMode, jobDescription = ""): CareerPathResumeContent {
  const role = profile.target.role || extractTargetRole(jobDescription) || "Entry-Level Role";
  const supportedRoleKeywords = getSupportedRoleKeywords(profile, role, jobDescription);
  const projectFirst = profile.experience.length === 0;
  const skillGroups = buildSkillGroups(profile, supportedRoleKeywords);
  const projects = profile.projects.map((project) => ({
    name: project.name,
    techStack: project.techStack,
    link: project.links[0],
    bullets: mineProjectBullets(project, role),
  }));

  return {
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
    summary: buildSummary(profile, role, supportedRoleKeywords),
    skills: skillGroups,
    experience: profile.experience.map((experience) => ({
      company: experience.company,
      role: experience.role || role,
      dates: [experience.startDate, experience.endDate].filter(Boolean).join(" - "),
      bullets: mineExperienceBullets(experience, role),
    })),
    projects: projectFirst ? projects : projects.slice(0, 3),
    education: profile.education.map((education) => ({
      institution: education.institution,
      degree: [education.degree, education.field].filter(Boolean).join(", "),
      dates: [education.startYear, education.endYear].filter(Boolean).join(" - "),
      score: education.score,
      location: education.location,
    })),
    certifications: profile.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date,
      link: certification.credentialLink,
    })),
    achievements: profile.achievements,
    languages: profile.languages,
  };
}

// ---------------------------------------------------------------------------
// Resume Improvement
// ---------------------------------------------------------------------------

export function improveResume(content: CareerPathResumeContent, audit: CareerPathResumeAudit, targetRole: string): CareerPathResumeContent {
  const role = targetRole || "target role";
  const improved: CareerPathResumeContent = JSON.parse(JSON.stringify(content));

  improved.summary = tightenSummary(improved.summary, role);
  improved.projects = improved.projects.map((project) => ({
    ...project,
    bullets: unique(
      project.bullets.map((bullet) => professionalizeBullet(bullet, role)).concat(
        project.bullets.length < 2 ? [`Built ${project.name} with ${project.techStack.join(", ") || "a practical technical stack"} to solve a clearly defined user workflow.`] : [],
      ),
    ).slice(0, 3),
  }));
  improved.experience = improved.experience.map((experience) => ({
    ...experience,
    bullets: experience.bullets.map((bullet) => professionalizeBullet(bullet, role)).slice(0, 4),
  }));

  if (audit.issues.some((issue) => issue.type === "role_alignment")) {
    improved.skills = improved.skills.map((group) => ({
      ...group,
      items: unique(group.items).slice(0, 12),
    }));
  }

  return improved;
}

// ---------------------------------------------------------------------------
// Resume Tailoring
// ---------------------------------------------------------------------------

export function tailorResume(
  resume: CareerPathResume,
  profile: CareerPathProfile | undefined,
  jobDescription: string,
): CareerPathTailoringResult {
  const sourceText = [resumeToText(resume.content), profile?.rawNotes ?? ""].join("\n").toLowerCase();
  const jdKeywords = targetKeywords(resume.targetRole, jobDescription);
  const matchedKeywords = jdKeywords.filter((keyword) => sourceText.includes(keyword.toLowerCase()));
  const missingKeywordsNotAdded = jdKeywords.filter((keyword) => !sourceText.includes(keyword.toLowerCase())).slice(0, 8);
  const tailoredResume: CareerPathResumeContent = JSON.parse(JSON.stringify(resume.content));
  const safeKeywordsAdded = matchedKeywords.filter((keyword) => !resumeToText(tailoredResume).toLowerCase().includes(keyword.toLowerCase()));

  tailoredResume.summary = buildTailoredSummary(tailoredResume.summary, resume.targetRole, matchedKeywords);
  tailoredResume.skills = tailoredResume.skills.map((group) => ({
    ...group,
    items: reorderByKeywords(group.items, matchedKeywords),
  }));
  tailoredResume.projects = tailoredResume.projects.map((project) => ({
    ...project,
    bullets: reorderByKeywords(project.bullets, matchedKeywords).map((bullet) => professionalizeBullet(bullet, resume.targetRole)),
  }));

  const matchScore = clampScore(48 + matchedKeywords.length * 6 + (tailoredResume.projects.length ? 8 : 0));

  return {
    matchScore,
    matchedKeywords,
    safeKeywordsAdded,
    missingKeywordsNotAdded,
    tailoringSummary: [
      "Reordered supported skills and bullets toward the job description.",
      "Rewrote the summary around the target role without adding unsupported claims.",
      missingKeywordsNotAdded.length ? "Left unsupported job keywords out of the resume." : "No major unsupported keywords found.",
    ],
    tailoredResume,
  };
}

// ---------------------------------------------------------------------------
// Resume Record Factory
// ---------------------------------------------------------------------------

export function createResumeRecord(input: {
  userId: string;
  mode: BuilderMode;
  targetRole: string;
  content: CareerPathResumeContent;
  profile?: CareerPathProfile;
  jobDescription?: string;
  version?: number;
  title?: string;
  audit?: CareerPathResumeAudit;
}): CareerPathResume {
  const now = new Date().toISOString();
  const audit = input.audit || auditResume(input.content, input.targetRole, input.jobDescription);
  return {
    id: createId(),
    userId: input.userId,
    profileId: input.profile?.id,
    title: input.title || `${input.targetRole || "CareerPath"} Resume`,
    targetRole: input.targetRole || "Target Role",
    mode: input.mode,
    status: "final",
    content: input.content,
    profile: input.profile,
    score: audit.score,
    audit,
    jobDescription: input.jobDescription,
    version: input.version ?? 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Bullet & Summary Helpers
// ---------------------------------------------------------------------------

function mineProjectBullets(project: CareerPathProfile["projects"][number], role: string) {
  const stack = project.techStack.join(", ");
  const bullets = [
    `Built ${project.name}${stack ? ` using ${stack}` : ""} for ${role.toLowerCase()} portfolio proof.`,
  ];
  if (project.problemSolved) bullets.push(`Designed the project around ${project.problemSolved.toLowerCase()}.`);
  if (project.features.length) bullets.push(`Implemented ${project.features.slice(0, 3).join(", ")} with clear user flows.`);
  if (project.impact) bullets.push(`Documented outcome: ${project.impact}.`);
  return unique(bullets).slice(0, 3);
}

function mineExperienceBullets(experience: CareerPathProfile["experience"][number], role: string) {
  const source = experience.achievements.length ? experience.achievements : experience.responsibilities;
  const bullets = source.length
    ? source.map((item) => professionalizeBullet(item, role))
    : [`Supported ${role.toLowerCase()} work through assigned responsibilities and project delivery.`];
  return unique(bullets).slice(0, 4);
}

function buildSummary(profile: CareerPathProfile, role: string, keywords: string[]) {
  const strongest = [
    profile.projects.length ? `${profile.projects.length} project${profile.projects.length > 1 ? "s" : ""}` : "",
    profile.education[0]?.degree,
    keywords.slice(0, 4).join(", "),
  ].filter(Boolean);
  return `${profile.target.experienceLevel || "Early-career"} candidate targeting ${role}. Brings ${strongest.join("; ") || "practical learning, project work, and a willingness to build proof-backed skills"}. Focused on clear, truthful, ATS-friendly applications built from real work.`;
}

function buildSkillGroups(profile: CareerPathProfile, supportedKeywords: string[]) {
  const groups = [
    { category: "Programming", items: profile.skills.programming },
    { category: "Frameworks", items: profile.skills.frameworks },
    { category: "Tools", items: profile.skills.tools },
    { category: "Databases", items: profile.skills.databases },
    { category: "AI Tools", items: profile.skills.aiTools },
    { category: "Soft Skills", items: profile.skills.softSkills },
  ]
    .map((group) => ({ ...group, items: reorderByKeywords(unique([...group.items, ...supportedKeywords.filter((keyword) => group.items.includes(keyword))]), supportedKeywords) }))
    .filter((group) => group.items.length);
  return groups.length ? groups : [{ category: "Skills", items: ["Project execution", "Problem solving", "Learning agility"] }];
}

function getSupportedRoleKeywords(profile: CareerPathProfile, role: string, jobDescription: string) {
  const allSkills = Object.values(profile.skills).flat();
  const keywords = targetKeywords(role, jobDescription);
  return unique([...allSkills.filter((skill) => keywords.some((keyword) => keyword.toLowerCase() === skill.toLowerCase())), ...allSkills.slice(0, 6)]);
}

export function professionalizeBullet(bullet: string, role: string) {
  const trimmed = bullet.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return `Built role-relevant project work for ${role}.`;
  const startsWithAction = /^(built|created|developed|designed|implemented|improved|analyzed|managed|supported|wrote|deployed)\b/i.test(trimmed);
  const actioned = startsWithAction ? trimmed : `Built ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
  return sentenceCase(actioned.replace(/\bvery\b|\breally\b|\bamazing\b|\bbest\b/gi, "").replace(/\s+/g, " "));
}

function tightenSummary(summary: string, role: string) {
  const clean = summary.replace(/\bpassionate\b|\bhardworking\b|\bdynamic\b/gi, "").replace(/\s+/g, " ").trim();
  if (!clean) return `Truthful, project-focused candidate targeting ${role}, with resume content built from real education, skills, projects, and proof links.`;
  return clean.length > 300 ? `${clean.slice(0, 297).trim()}...` : clean;
}

function buildTailoredSummary(summary: string, role: string, keywords: string[]) {
  const keywordText = keywords.slice(0, 5).join(", ");
  const base = tightenSummary(summary, role).replace(/\.$/, "");
  return `${base}. Tailored for ${role}${keywordText ? ` with supported experience in ${keywordText}` : ""}.`;
}
