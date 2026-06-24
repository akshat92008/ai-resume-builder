import type { UserVault } from "@/lib/types";
import type { PortfolioAgentResult, ProofAuditResult } from "./types";
import { clampScore, cleanText, hasAnyProjectProof, projectProofItems, unique } from "./utils";

export function reviewPortfolioWithAgent(vault: UserVault, proofAudit: ProofAuditResult): PortfolioAgentResult {
  const profile = vault.profile;
  const featuredProjects = vault.projects
    .filter((project) => cleanText(project.title))
    .sort((a, b) => Number(hasAnyProjectProof(b)) - Number(hasAnyProjectProof(a)))
    .slice(0, 3)
    .map((project) => ({
      title: cleanText(project.title),
      description: cleanText(project.short_description) || cleanText(project.problem_solved),
      proofLinks: projectProofItems(project),
    }));

  const skillsWithProof = proofAudit.claimProofMap
    .filter((claim) => claim.source === "skills" && claim.proofFound)
    .map((claim) => claim.claim);

  const portfolioReadiness = clampScore(
    (profile.portfolio_public ? 25 : 0) +
      (cleanText(profile.public_slug) ? 10 : 0) +
      (cleanText(profile.full_name) ? 10 : 0) +
      (profile.target_roles.length > 0 ? 10 : 0) +
      (featuredProjects.length >= 2 ? 20 : featuredProjects.length * 10) +
      Math.min(skillsWithProof.length * 5, 15) +
      (proofAudit.proofScore >= 60 ? 10 : 0),
  );

  return {
    headline: cleanText(profile.headline) || `${profile.target_roles[0] || "Early-career"} candidate with proof-backed projects`,
    summary:
      cleanText(profile.summary) ||
      `${cleanText(profile.full_name) || "This candidate"} is building a transparent recruiter profile with projects, skills, and proof links visible where available.`,
    featuredProjects,
    skillsWithProof: unique(skillsWithProof).slice(0, 10),
    proofGaps: proofAudit.missingProof.slice(0, 6),
    whyHireThisCandidate:
      proofAudit.proofScore >= 65
        ? "The profile has visible proof for important claims and is easier for recruiters to verify."
        : "The profile is honest, but needs stronger public proof before it feels recruiter-ready.",
    portfolioReadiness,
  };
}
