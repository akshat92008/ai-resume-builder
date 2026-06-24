import type { UserVault } from "@/lib/types";
import type { CareerVaultReport } from "./types";
import { expandProjectWithAgent } from "./project-expander-agent";
import {
  clampScore,
  cleanText,
  hasUrl,
  isPlaceholderText,
  projectDisplayDescription,
  scoreBand,
} from "./utils";

export function inspectCareerVault(vault: UserVault): CareerVaultReport {
  const missingFields: string[] = [];
  const questionsToAsk: string[] = [];
  const nextActions: string[] = [];
  const blockingIssues: string[] = [];

  const profile = vault.profile;
  let profileCompleteness = 0;

  if (cleanText(profile.full_name)) profileCompleteness += 22;
  else {
    missingFields.push("Name");
    blockingIssues.push("Add your name before generating a resume.");
  }

  if (cleanText(profile.email)) profileCompleteness += 18;
  else missingFields.push("Email");

  if (cleanText(profile.phone) || cleanText(profile.city)) profileCompleteness += 10;

  if (profile.target_roles.some(cleanText)) profileCompleteness += 22;
  else {
    missingFields.push("Target role");
    blockingIssues.push("Choose a target role so the resume has a clear angle.");
  }

  if (cleanText(profile.summary) || cleanText(profile.headline)) profileCompleteness += 13;
  if (hasUrl(profile.linkedin_url) || hasUrl(profile.github_url) || hasUrl(profile.portfolio_url)) profileCompleteness += 15;
  profileCompleteness = clampScore(profileCompleteness);

  const projectReports = vault.projects.map((project) => expandProjectWithAgent(project, profile.target_roles[0] ?? ""));
  const weakProjects = projectReports.filter((project) => project.projectHealth < 65);
  const strongProjects = projectReports.filter((project) => project.projectHealth >= 65);

  const projectDepth = vault.projects.length === 0
    ? 0
    : clampScore(
        Math.round(projectReports.reduce((total, project) => total + project.projectHealth, 0) / vault.projects.length),
      );

  if (vault.projects.length === 0) {
    missingFields.push("At least one project");
    blockingIssues.push("Add at least one real project before generating a resume.");
  }

  if (vault.skills.filter((skill) => cleanText(skill.name)).length < 2) {
    missingFields.push("At least two skills");
    blockingIssues.push("Add at least two real skills before generating a resume.");
  }

  const projectWithDescription = vault.projects.find((project) => {
    const description = projectDisplayDescription(project);
    return description && !isPlaceholderText(description);
  });
  if (vault.projects.length > 0 && !projectWithDescription) {
    missingFields.push("Strongest project description");
    blockingIssues.push("Explain what your strongest project does before generating a resume.");
  }

  const projectProofCount = vault.projects.filter((project) =>
    hasUrl(project.github_url) || hasUrl(project.live_url) || hasUrl(project.case_study_url) || hasUrl(project.screenshots_url),
  ).length;
  const skillProofCount = vault.skills.filter((skill) => skill.proof_links.some(hasUrl)).length;
  const globalProofCount = vault.proof_links.filter((proof) => hasUrl(proof.url)).length;
  const certificateProofCount = vault.certificates.filter((certificate) => hasUrl(certificate.credential_url)).length;
  const achievementProofCount = vault.achievements.filter((achievement) => hasUrl(achievement.proof_url)).length;
  const proofItems = projectProofCount + skillProofCount + globalProofCount + certificateProofCount + achievementProofCount;

  const proofCoverage = clampScore(
    (vault.projects.length ? (projectProofCount / vault.projects.length) * 45 : 0) +
      (vault.skills.length ? (skillProofCount / vault.skills.length) * 25 : 0) +
      Math.min(globalProofCount * 8, 20) +
      Math.min((certificateProofCount + achievementProofCount) * 5, 10),
  );

  vault.skills
    .filter((skill) => cleanText(skill.name) && skill.proof_links.length === 0)
    .slice(0, 3)
    .forEach((skill) => nextActions.push(`Add proof for ${skill.name}.`));

  weakProjects.slice(0, 2).forEach((project) => {
    const firstQuestion = project.targetedQuestions[0];
    nextActions.push(`Improve ${project.title}: ${firstQuestion}`);
  });

  if (!hasUrl(profile.github_url)) nextActions.push("Add your GitHub profile if you have one.");
  if (!hasUrl(profile.linkedin_url)) nextActions.push("Add your LinkedIn profile before applying.");

  if (weakProjects[0]) questionsToAsk.push(weakProjects[0].targetedQuestions[0]);
  if (!questionsToAsk.length && missingFields.includes("Target role")) {
    questionsToAsk.push("Which role are you applying for first?");
  }
  if (!questionsToAsk.length && proofItems === 0) {
    questionsToAsk.push("Which proof link can you add first: GitHub, live demo, certificate, or screenshot?");
  }

  const vaultReadiness = clampScore(profileCompleteness * 0.3 + projectDepth * 0.4 + proofCoverage * 0.3);
  const canGenerateResume = blockingIssues.length === 0;

  return {
    vaultReadiness,
    readinessLabel: scoreBand(vaultReadiness),
    profileCompleteness,
    projectDepth,
    proofCoverage,
    missingFields: Array.from(new Set(missingFields)),
    weakProjects,
    strongProjects,
    questionsToAsk: Array.from(new Set(questionsToAsk)).slice(0, 3),
    nextActions: Array.from(new Set(nextActions)).slice(0, 6),
    canGenerateResume,
    blockingIssues: Array.from(new Set(blockingIssues)),
  };
}
