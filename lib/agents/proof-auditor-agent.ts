import type { JobAnalysis, ResumeContent, UserVault } from "@/lib/types";
import type { ClaimProofItem, ClaimProofMapItem, ProofAuditResult } from "./types";
import { clampScore, cleanText, hasAnyProjectProof, hasUrl, projectProofItems, resumeText, unique } from "./utils";

function claimKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.+#]/g, "");
}

function projectSupportsSkill(projectTech: string[], skill: string) {
  const target = claimKey(skill);
  return projectTech.some((tech) => {
    const source = claimKey(tech);
    return source.includes(target) || target.includes(source);
  });
}

function auditSkillClaim(vault: UserVault, skillName: string): ClaimProofMapItem {
  const skill = vault.skills.find((item) => claimKey(item.name) === claimKey(skillName));
  const proofItems: ClaimProofItem[] = [];

  skill?.proof_links.filter(hasUrl).forEach((url) => proofItems.push({ label: `${skillName} proof`, url, source: "skill" }));

  vault.projects
    .filter((project) => projectSupportsSkill(project.tech_stack, skillName) && hasAnyProjectProof(project))
    .forEach((project) => {
      proofItems.push(...projectProofItems(project).map((proof) => ({ ...proof, label: `${project.title}: ${proof.label}` })));
    });

  vault.certificates
    .filter((certificate) => certificate.related_skills.some((related) => claimKey(related) === claimKey(skillName)) && hasUrl(certificate.credential_url))
    .forEach((certificate) => proofItems.push({ label: certificate.title, url: certificate.credential_url, source: "certificate" }));

  const hasProjectContext = vault.projects.some((project) => projectSupportsSkill(project.tech_stack, skillName));

  return {
    claim: skillName,
    source: "skills",
    proofFound: proofItems.length > 0,
    proofItems,
    confidence: proofItems.length > 0 ? "high" : hasProjectContext ? "medium" : "low",
    reason:
      proofItems.length > 0
        ? "This skill is connected to visible proof."
        : hasProjectContext
          ? "This skill appears in project tech stack, but the project lacks a proof link."
          : "This skill is listed without visible proof.",
  };
}

export function auditProof(vault: UserVault, resume?: ResumeContent | null, jobAnalysis?: JobAnalysis | null): ProofAuditResult {
  const claimProofMap: ClaimProofMapItem[] = [];
  const unsupportedClaims: string[] = [];
  const weakClaims: string[] = [];
  const verifiedClaims: string[] = [];
  const missingProof: string[] = [];
  const recommendations: string[] = [];

  const skillClaims = unique([
    ...vault.skills.map((skill) => skill.name),
    ...vault.projects.flatMap((project) => project.tech_stack),
    ...(jobAnalysis?.matchingSkills ?? []),
  ]);

  skillClaims.forEach((skill) => {
    const item = auditSkillClaim(vault, skill);
    claimProofMap.push(item);
    if (item.proofFound) verifiedClaims.push(skill);
    else {
      weakClaims.push(skill);
      missingProof.push(`${skill}: attach a project, certificate, GitHub repo, live demo, or case study.`);
    }
  });

  vault.projects.forEach((project) => {
    const proofItems = projectProofItems(project);
    const claim = cleanText(project.title) || "Untitled project";
    const item: ClaimProofMapItem = {
      claim,
      source: "projects",
      proofFound: proofItems.length > 0,
      proofItems,
      confidence: proofItems.length > 0 ? "high" : cleanText(project.short_description) ? "medium" : "low",
      reason: proofItems.length > 0 ? "Project has visible proof." : "Project lacks GitHub, live demo, screenshots, or case study proof.",
    };
    claimProofMap.push(item);
    if (item.proofFound) verifiedClaims.push(claim);
    else {
      weakClaims.push(claim);
      missingProof.push(`${claim}: add GitHub, live demo, screenshots, or case study proof.`);
    }
  });

  vault.certificates.forEach((certificate) => {
    if (!cleanText(certificate.title)) return;
    if (hasUrl(certificate.credential_url)) verifiedClaims.push(certificate.title);
    else {
      weakClaims.push(certificate.title);
      missingProof.push(`${certificate.title}: add credential URL.`);
    }
  });

  if (resume) {
    const text = resumeText(resume).toLowerCase();
    const vaultClaims = unique([
      ...skillClaims,
      ...vault.projects.map((project) => project.title),
      ...vault.certificates.map((certificate) => certificate.title),
      ...vault.experiences.map((experience) => experience.company),
    ]).map(claimKey);

    const riskyClaims = ["internship", "intern", "award", "winner", "certified", "open source", "deployed", "production", "ai", "machine learning"];
    riskyClaims.forEach((claim) => {
      if (!text.includes(claim)) return;
      const normalized = claimKey(claim);
      const supported =
        vaultClaims.some((vaultClaim) => vaultClaim.includes(normalized) || normalized.includes(vaultClaim)) ||
        claimProofMap.some((item) => claimKey(item.claim).includes(normalized) && item.proofFound);
      if (!supported && !unsupportedClaims.includes(claim)) {
        unsupportedClaims.push(claim);
      }
    });
  }

  if (!hasUrl(vault.profile.github_url)) recommendations.push("Add GitHub profile proof if your projects are code-based.");
  if (!hasUrl(vault.profile.linkedin_url)) recommendations.push("Add LinkedIn so recruiters can verify your identity and activity.");
  if (missingProof.length > 0) recommendations.push("Prioritize one proof link for your strongest project before applying.");

  const verifiedCount = claimProofMap.filter((item) => item.proofFound).length;
  const proofScore = claimProofMap.length === 0 ? 0 : clampScore((verifiedCount / claimProofMap.length) * 100);

  return {
    claimProofMap,
    unsupportedClaims: unique(unsupportedClaims).slice(0, 8),
    weakClaims: unique(weakClaims).slice(0, 10),
    verifiedClaims: unique(verifiedClaims).slice(0, 10),
    proofScore,
    missingProof: unique(missingProof).slice(0, 8),
    recommendations: unique(recommendations).slice(0, 5),
  };
}
