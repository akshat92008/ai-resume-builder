import type { ResumeContent, UserVault } from "@/lib/types";
import type { ProofAuditResult, ResumeCriticResult } from "./types";
import { clampScore, cleanText, hasUrl, resumeQualityBand, resumeText } from "./utils";

const GENERIC_PATTERNS = [
  "hardworking",
  "quick learner",
  "passionate",
  "team player",
  "results-oriented",
  "i build things",
  "responsible for",
  "seeking opportunity",
];

export function critiqueResumeWithAgent(
  resume: ResumeContent,
  vault: UserVault,
  proofAudit: ProofAuditResult,
): ResumeCriticResult {
  const text = resumeText(resume).toLowerCase();
  const genericLanguageIssues = GENERIC_PATTERNS.filter((pattern) => text.includes(pattern));
  const weakBullets = resume.projects
    .flatMap((project) => project.bullets.map((bullet) => ({ project: project.title, bullet })))
    .filter(({ bullet }) => cleanText(bullet).split(/\s+/).length < 8 || /built things|worked on|various/i.test(bullet))
    .map(({ project, bullet }) => `${project}: ${bullet}`)
    .slice(0, 6);

  const missingProof = [
    ...proofAudit.missingProof.slice(0, 6),
    ...resume.projects
      .filter((project) => project.proofLinks.length === 0)
      .map((project) => `${project.title}: add GitHub, live demo, screenshots, or case study link.`),
  ];

  const atsReadiness = clampScore(
    (cleanText(resume.header.name) ? 15 : 0) +
      (cleanText(resume.summary).length >= 80 ? 20 : 8) +
      (resume.skills.technical.length + resume.skills.tools.length >= 4 ? 20 : 8) +
      (resume.projects.length > 0 ? 20 : 0) +
      (resume.education.length > 0 ? 10 : 0) +
      (genericLanguageIssues.length === 0 ? 15 : 5),
  );

  const proofBackedScore = clampScore(
    proofAudit.proofScore * 0.75 +
      (resume.header.links.some((link) => hasUrl(link.url)) ? 10 : 0) +
      (resume.projects.some((project) => project.proofLinks.length > 0) ? 15 : 0),
  );

  const resumeQualityScore = clampScore(
    atsReadiness * 0.45 +
      proofBackedScore * 0.35 +
      (weakBullets.length === 0 ? 20 : Math.max(0, 20 - weakBullets.length * 4)) -
      genericLanguageIssues.length * 4 -
      proofAudit.unsupportedClaims.length * 8,
  );

  const recommendedEdits = [
    !cleanText(vault.profile.email) ? "Add a professional email address." : "",
    missingProof[0] ? missingProof[0] : "",
    weakBullets[0] ? "Rewrite weak bullets using action, what you built, tech used, and value." : "",
    genericLanguageIssues[0] ? `Replace generic wording: ${genericLanguageIssues.slice(0, 3).join(", ")}.` : "",
  ].filter(Boolean);

  return {
    resumeQualityScore,
    qualityLabel: resumeQualityBand(resumeQualityScore),
    atsReadiness,
    proofBackedScore,
    genericLanguageIssues,
    unsupportedClaims: proofAudit.unsupportedClaims,
    missingProof: Array.from(new Set(missingProof)).slice(0, 8),
    weakBullets,
    recommendedEdits: recommendedEdits.length ? recommendedEdits.slice(0, 5) : ["Resume looks usable. Keep proof links current."],
    canUserDownload: resumeQualityScore >= 60 && proofAudit.unsupportedClaims.length === 0,
  };
}
