/**
 * CareerOS — Resume Domain
 *
 * Resume document creation, smart versioning, scoring, and mining.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeAudit,
  CareerProfile,
  ProofLevel,
  ResumeBullet,
  ResumeDocument,
  ResumeScore,
  ResumeVersionType,
  SmartResumeVersion,
  AchievementItem,
  AchievementMiningResult,
  CareerGap,
} from "../types";
import { achievementItem, bullet, createId, gap, section, sentenceCase, unique, uniqueBy } from "./utils";

// ---------------------------------------------------------------------------
// Version Guidance
// ---------------------------------------------------------------------------

const VERSION_GUIDANCE: Record<ResumeVersionType, Omit<SmartResumeVersion, "versionType">> = {
  master: {
    title: "Master Resume",
    whenToUse: "Use as the complete source resume before tailoring to a specific job.",
    emphasizes: ["Complete career memory", "Reusable proof", "All credible projects and experience"],
    reduces: ["Nothing by default"],
    missing: [],
  },
  fresher: {
    title: "Fresher Resume",
    whenToUse: "Use for entry-level roles where education, projects, and proof links carry the resume.",
    emphasizes: ["Education", "Projects", "Technical skills", "Certifications"],
    reduces: ["Generic summary text", "Unsupported claims"],
    missing: [],
  },
  internship: {
    title: "Internship Resume",
    whenToUse: "Use for internship applications that need fast proof of learning and execution.",
    emphasizes: ["Role-relevant projects", "Learning speed", "Tools used", "Availability cues"],
    reduces: ["Unrelated certificates", "Weak filler skills"],
    missing: [],
  },
  frontend: {
    title: "Frontend Developer Resume",
    whenToUse: "Use for frontend internships, React roles, and UI-heavy product engineering roles.",
    emphasizes: ["React/Next.js", "Responsive UI", "User flows", "Deployed frontend projects"],
    reduces: ["Backend-only details", "Unrelated coursework"],
    missing: [],
  },
  fullstack: {
    title: "Full Stack Developer Resume",
    whenToUse: "Use when the role expects frontend, backend, database, and deployment ownership.",
    emphasizes: ["APIs", "Databases", "Authentication", "End-to-end project delivery"],
    reduces: ["Pure design language", "Unsupported platform claims"],
    missing: [],
  },
  ai_product: {
    title: "AI Product Builder Resume",
    whenToUse: "Use for AI product internships, founder office roles, product engineering, and early-stage AI startups.",
    emphasizes: ["AI projects", "Product thinking", "Shipped prototypes", "LLM/API experience"],
    reduces: ["Generic school details", "Unrelated certificates", "Weak filler skills"],
    missing: [],
  },
  startup: {
    title: "Startup Resume",
    whenToUse: "Use for small teams that value shipping speed, ownership, and practical execution.",
    emphasizes: ["Ownership", "Fast builds", "Ambiguous problem solving", "Deployment readiness"],
    reduces: ["Corporate phrasing", "Long process-heavy descriptions"],
    missing: [],
  },
  corporate: {
    title: "Corporate Resume",
    whenToUse: "Use for larger companies where ATS clarity and conservative formatting matter.",
    emphasizes: ["ATS keywords", "Readable structure", "Education", "Professional language"],
    reduces: ["Over-casual product language", "Unverified claims"],
    missing: [],
  },
  job_specific: {
    title: "Job-Specific Resume",
    whenToUse: "Use after pasting a job description and tailoring the resume to that exact role.",
    emphasizes: ["Matched keywords", "Relevant bullets", "Recruiter fit", "Risk warnings"],
    reduces: ["Irrelevant clutter", "Unsupported keywords"],
    missing: [],
  },
};

// ---------------------------------------------------------------------------
// Resume Document Creation
// ---------------------------------------------------------------------------

export function createResumeDocumentFromResume(
  resume: CareerPathResume,
  profile: CareerProfile,
  versionType: ResumeVersionType = "master",
): ResumeDocument {
  const now = new Date().toISOString();
  const bullets: ResumeBullet[] = [];
  const sections = [
    section("summary", "Summary", 1, resume.content.summary),
    section("skills", "Skills", 2, resume.content.skills),
    section("experience", "Experience", 3, resume.content.experience),
    section("projects", "Projects", 4, resume.content.projects),
    section("education", "Education", 5, resume.content.education),
    section("certifications", "Certifications", 6, resume.content.certifications),
    section("achievements", "Achievements", 7, resume.content.achievements),
    section("links", "Links", 8, resume.content.header.links),
  ].filter((item) => hasSectionContent(item.content));

  for (const project of resume.content.projects) {
    const source = profile.projects.find((item) => item.name.toLowerCase() === project.name.toLowerCase());
    for (const text of project.bullets) {
      bullets.push(bullet(text, "project", source?.id, source?.proofLevel || inferProofLevel(text, project.link)));
    }
  }
  for (const experience of resume.content.experience) {
    const source = profile.experience.find((item) => item.company.toLowerCase() === experience.company.toLowerCase());
    for (const text of experience.bullets) {
      bullets.push(bullet(text, "experience", source?.id, source?.proofLevel || inferProofLevel(text)));
    }
  }
  for (const text of resume.content.achievements) {
    bullets.push(bullet(text, "achievement", undefined, inferProofLevel(text)));
  }

  return {
    id: resume.id,
    profileId: profile.id,
    title: resume.title,
    targetRole: resume.targetRole,
    versionType,
    sections,
    bullets,
    score: toReadinessScore(resume.audit, resume.tailoring?.matchScore),
    createdAt: resume.createdAt || now,
    updatedAt: resume.updatedAt || now,
  };
}

// ---------------------------------------------------------------------------
// Smart Resume Versions
// ---------------------------------------------------------------------------

export function generateSmartResumeVersions(resume: CareerPathResume, profile: CareerProfile): SmartResumeVersion[] {
  const missing = profile.gaps.filter((item) => item.status === "open").map((item) => item.area).slice(0, 4);
  return (Object.entries(VERSION_GUIDANCE) as [ResumeVersionType, Omit<SmartResumeVersion, "versionType">][])
    .map(([versionType, item]) => ({
      versionType,
      ...item,
      missing: missing.length ? missing : item.missing,
    }))
    .filter((item) => item.versionType !== "job_specific" || Boolean(resume.jobDescription));
}

// ---------------------------------------------------------------------------
// Achievement Mining
// ---------------------------------------------------------------------------

export function mineAchievements(profile: CareerProfile): AchievementMiningResult {
  const suggestedAchievements: AchievementItem[] = [];
  const questions: CareerGap[] = [];
  const weakBullets: string[] = [];
  const strongBullets: string[] = [];

  for (const project of profile.projects) {
    const stack = project.technologies.join(", ");
    const hasProof = project.links.length > 0 || Boolean(project.achievements.some((item) => item.metric || item.evidence));
    const bulletText = `Built ${project.name}${stack ? ` using ${stack}` : ""}${project.description ? ` to ${project.description.toLowerCase()}` : " as a portfolio project"}.`;
    if (hasProof || project.technologies.length >= 2) {
      strongBullets.push(bulletText);
      suggestedAchievements.push(achievementItem(bulletText, hasProof ? "strong" : "estimated", project.name));
    } else {
      weakBullets.push(bulletText);
      questions.push(gap("project_proof", `What tech stack, deployed link, GitHub link, or user result can prove ${project.name}?`, "high"));
    }

    if (!project.links.length) questions.push(gap("project_link", `Do you have a GitHub or live demo link for ${project.name}?`, "high"));
    if (!project.achievements.some((item) => item.impact || item.metric)) {
      questions.push(gap("project_impact", `What changed because of ${project.name}: users, time saved, workflow improved, or problem solved?`, "medium"));
    }
  }

  for (const experience of profile.experience) {
    const source = experience.achievements.length ? experience.achievements.map((item) => item.text) : experience.responsibilities;
    for (const item of source) {
      const bulletText = item.match(/^(built|created|developed|designed|implemented|improved|led|supported)/i)
        ? item
        : `Delivered ${item.charAt(0).toLowerCase()}${item.slice(1)}`;
      strongBullets.push(sentenceCase(bulletText));
      suggestedAchievements.push(achievementItem(sentenceCase(bulletText), experience.proofLevel || "strong", experience.company));
    }
  }

  return {
    suggestedAchievements: uniqueBy(suggestedAchievements, (item) => item.text.toLowerCase()).slice(0, 8),
    questions: uniqueBy(questions, (item) => item.question).slice(0, 5),
    weakBullets: unique(weakBullets).slice(0, 6),
    strongBullets: unique(strongBullets).slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// Score Helpers
// ---------------------------------------------------------------------------

export function toReadinessScore(audit?: CareerPathResumeAudit, tailoringScore?: number): ResumeScore {
  const score = audit?.score;
  const roleMatch = score?.roleAlignment ?? tailoringScore ?? 65;
  const keywordMatch = score?.keywordCoverage ?? tailoringScore ?? 62;
  const proofStrength = score?.proofAndMetrics ?? 58;
  const readability = score?.clarity ?? 72;
  const seniorityFit = score?.onePageFit ?? 74;
  const atsCompatibility = score?.atsCompatibility ?? 88;
  const overall = score?.overall ?? Math.round((roleMatch + keywordMatch + proofStrength + readability + seniorityFit + atsCompatibility) / 6);
  return {
    overall,
    roleMatch,
    keywordMatch,
    proofStrength,
    readability,
    seniorityFit,
    atsCompatibility,
    explanation: `Career Readiness Score: ${overall}/100. Improve it by increasing proof, role alignment, and supported keyword coverage.`,
  };
}

export function inferProofLevel(text: string, link?: string | null): ProofLevel {
  if (link) return "verified";
  if (/\b\d+%|\b\d+\s+(users|testers|customers|pages|projects|hours)\b/i.test(text)) return "estimated";
  if (/\b(built|developed|implemented|designed|deployed)\b/i.test(text) && /\b(using|with|react|next|supabase|api|sql|tailwind)\b/i.test(text)) return "strong";
  if (/\b(best|amazing|expert|world-class|guaranteed)\b/i.test(text)) return "risky";
  return "weak";
}

// ---------------------------------------------------------------------------
// Helpers (Private)
// ---------------------------------------------------------------------------

function hasSectionContent(content: unknown) {
  if (Array.isArray(content)) return content.length > 0;
  if (content && typeof content === "object") return Object.values(content).some(Boolean);
  return Boolean(content);
}
