/**
 * CareerPath AI — Resume Evaluator
 *
 * Handles gap detection, resume auditing, and scoring.
 * Extracted from agents.ts to satisfy the Single Responsibility Principle.
 */

import type {
  BuilderMode,
  CareerPathAuditIssue,
  CareerPathProfile,
  CareerPathResumeAudit,
  CareerPathResumeContent,
  CareerPathResumeScore,
  GapReport,
  GapQuestion,
} from "./types";
import { clampScore, unique, uniqueBy, resumeToText } from "./text-utils";
import { targetKeywords } from "./parser";

// ---------------------------------------------------------------------------
// Gap Detection
// ---------------------------------------------------------------------------

export function detectGaps(profile: CareerPathProfile, mode: BuilderMode): GapReport {
  const criticalMissing: string[] = [];
  const recommendedMissing: string[] = [];
  const resumeRisk: string[] = [];
  const questionsToAsk: GapQuestion[] = [];

  if (!profile.target.role) {
    criticalMissing.push("target role");
    questionsToAsk.push({
      question: mode === "improve" ? "What role should I optimize this resume for?" : "What role are you targeting?",
      reason: "The resume needs a clear role angle.",
      priority: "critical",
    });
  }

  if (!profile.education.length && !profile.projects.length && !profile.experience.length) {
    criticalMissing.push("education, project, or experience");
    resumeRisk.push("There is not enough career material to build a useful resume.");
    questionsToAsk.push({
      question: "Share at least one education detail, project, or work experience.",
      reason: "A useful resume needs one credible anchor.",
      priority: "critical",
    });
  }

  if (!profile.education.length && profile.target.experienceLevel.toLowerCase().includes("student")) {
    criticalMissing.push("education details");
    questionsToAsk.push({
      question: "What is your education institution, degree or course, and graduation year?",
      reason: "Education is important for student and fresher resumes.",
      priority: "critical",
    });
  }

  if (!profile.personal.github && !profile.personal.linkedin && !profile.personal.portfolio) {
    recommendedMissing.push("GitHub, LinkedIn, or portfolio link");
    questionsToAsk.push({
      question: "Do you have GitHub, LinkedIn, or portfolio links?",
      reason: "Links make technical resumes more credible.",
      priority: "recommended",
    });
  }

  const projectMissingDepth = profile.projects.some((project) => !project.techStack.length || !project.problemSolved);
  if (profile.projects.length && projectMissingDepth) {
    recommendedMissing.push("project tech stack or problem solved");
    resumeRisk.push("Projects need stronger proof and context.");
    questionsToAsk.push({
      question: "For your strongest project, what problem did it solve and what tech stack did you use?",
      reason: "Project proof is the strongest material for freshers.",
      priority: "critical",
    });
  }

  if (mode === "improve" && !profile.existingResumeText && profile.rawNotes.length < 220) {
    criticalMissing.push("existing resume text");
    questionsToAsk.push({
      question: "Paste more of your existing resume so I can audit and rewrite it.",
      reason: "Improvement works best when I can see the current resume.",
      priority: "critical",
    });
  }

  const uniqueQuestions = uniqueBy(questionsToAsk, (item) => item.question).slice(0, 4);
  const readyToGenerate =
    !!profile.target.role &&
    (profile.education.length > 0 || profile.projects.length > 0 || profile.experience.length > 0) &&
    !(mode === "improve" && !profile.existingResumeText && profile.rawNotes.length < 140);

  return {
    readyToGenerate,
    criticalMissing: unique(criticalMissing),
    recommendedMissing: unique(recommendedMissing),
    resumeRisk: unique(resumeRisk),
    questionsToAsk: readyToGenerate ? uniqueQuestions.slice(0, 3) : uniqueQuestions,
  };
}

// ---------------------------------------------------------------------------
// Resume Audit
// ---------------------------------------------------------------------------

export function auditResume(content: CareerPathResumeContent, targetRole: string, jobDescription = ""): CareerPathResumeAudit {
  const issues: CareerPathAuditIssue[] = [];
  const allText = resumeToText(content).toLowerCase();
  const roleKeywords = targetKeywords(targetRole, jobDescription);
  const matchedKeywords = roleKeywords.filter((keyword) => allText.includes(keyword.toLowerCase()));
  const hasContact = Boolean(content.header.email || content.header.phone);
  const hasProofLink = Boolean(content.header.links.github || content.header.links.portfolio || content.projects.some((project) => project.link));
  const projectBulletCount = content.projects.reduce((sum, project) => sum + project.bullets.length, 0);
  const hasUnsupportedMetrics = /\b\d{2,}%|\b\d{4,}\s+(users|students|customers|downloads)\b/i.test(allText);
  const wordCount = resumeToText(content).split(/\s+/).filter(Boolean).length;

  if (!hasContact) {
    issues.push({
      type: "missing_contact",
      section: "Header",
      message: "Add an email or phone number before sending the resume.",
      severity: "medium",
    });
  }
  if (!hasProofLink) {
    issues.push({
      type: "missing_proof",
      section: "Header/Projects",
      message: "Add GitHub, portfolio, or project links if available.",
      severity: "medium",
    });
  }
  if (content.projects.length && projectBulletCount < content.projects.length * 2) {
    issues.push({
      type: "weak_bullet",
      section: "Projects",
      message: "Project bullets need more detail about problem solved, features, or stack.",
      severity: "medium",
    });
  }
  if (matchedKeywords.length < Math.min(4, roleKeywords.length)) {
    issues.push({
      type: "role_alignment",
      section: "Skills",
      message: "The resume could align more tightly with the target role using supported keywords.",
      severity: "low",
    });
  }
  if (hasUnsupportedMetrics) {
    issues.push({
      type: "unsupported_metric",
      section: "Projects/Experience",
      message: "Large metrics should stay only if the user can prove them.",
      severity: "high",
    });
  }

  const score: CareerPathResumeScore = {
    atsCompatibility: clampScore(88 - (wordCount > 650 ? 8 : 0)),
    roleAlignment: clampScore(58 + matchedKeywords.length * 7 + (targetRole ? 8 : 0)),
    keywordCoverage: clampScore(roleKeywords.length ? Math.round((matchedKeywords.length / roleKeywords.length) * 100) : 72),
    bulletStrength: clampScore(58 + projectBulletCount * 4 + content.experience.reduce((sum, item) => sum + item.bullets.length, 0) * 4),
    clarity: clampScore(76 + (content.summary.length > 40 ? 8 : 0) - (content.summary.length > 420 ? 12 : 0)),
    proofAndMetrics: clampScore(52 + (hasProofLink ? 18 : 0) + (content.projects.some((project) => project.bullets.some((bullet) => /built|created|developed|implemented|designed/i.test(bullet))) ? 12 : 0)),
    onePageFit: clampScore(94 - Math.max(0, wordCount - 520) / 8),
    formattingSafety: 96,
    truthfulness: clampScore(hasUnsupportedMetrics ? 72 : 96),
    overall: 0,
  };
  score.overall = Math.round(
    (score.atsCompatibility + score.roleAlignment + score.keywordCoverage + score.bulletStrength + score.clarity + score.proofAndMetrics + score.onePageFit + score.formattingSafety + score.truthfulness) / 9,
  );

  return {
    score,
    issues,
    recommendedFixes: buildRecommendedFixes(issues, content),
    summary: `Resume Score: ${score.overall}/100. Treat this as practical guidance, not a hiring guarantee.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRecommendedFixes(issues: CareerPathAuditIssue[], content: CareerPathResumeContent) {
  const fixes: string[] = issues.map((issue) => {
    if (issue.type === "missing_contact") return "Add email or phone number to the header.";
    if (issue.type === "missing_proof") return "Add GitHub, portfolio, certificate, or live project links.";
    if (issue.type === "weak_bullet") return "Strengthen project bullets with problem, stack, and result.";
    if (issue.type === "role_alignment") return "Bring supported target-role skills higher in the skills and summary sections.";
    return "Review unsupported claims before applying.";
  });
  if (!content.education.length) fixes.push("Add education details if you are a student or fresher.");
  return unique(fixes).slice(0, 5);
}
