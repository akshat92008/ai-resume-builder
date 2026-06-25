import { UserVault } from "@/lib/types";

export type ResumeQualityReport = {
  canGenerate: boolean;
  blockingIssues: string[];
  warnings: string[];
  questionsToAsk: string[];
};

export function runResumeQualityGate(vault: UserVault): ResumeQualityReport {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const questionsToAsk: string[] = [];

  const profile = vault.profile;

  // 1 & 8. Check name/email
  if (!profile.full_name || profile.full_name.trim() === "") {
    blockingIssues.push("Add your name before generating a resume.");
  }
  if (!profile.email || profile.email.includes("demo@example.com")) {
    blockingIssues.push("Add a real email address before generating a resume.");
  }

  // 2. Check target role
  if (!profile.target_roles || profile.target_roles.length === 0 || !profile.target_roles[0].trim()) {
    blockingIssues.push("Choose a target role so the resume has a clear angle.");
    questionsToAsk.push("Which role are you applying for?");
  }

  // 3. Check skills
  const validSkills = vault.skills.filter((s) => s.name && s.name.trim() !== "");
  if (validSkills.length < 2) {
    blockingIssues.push("Add at least two skills before generating a resume.");
    questionsToAsk.push("What are your top 2 skills?");
  }

  // 4 & 5. Check projects and descriptions
  if (vault.projects.length === 0) {
    blockingIssues.push("Add at least one real project before generating a resume.");
    questionsToAsk.push("What is the most impressive project you have built?");
  } else {
    let hasGoodProject = false;
    for (const project of vault.projects) {
      const desc = project.short_description || project.problem_solved || "";
      if (desc.length > 20 && !desc.toLowerCase().includes("lorem")) {
        hasGoodProject = true;
      }
    }
    if (!hasGoodProject) {
      blockingIssues.push("Explain what your strongest project does before generating a resume.");
      questionsToAsk.push(`What did you actually build for ${vault.projects[0].title}?`);
    }
  }

  // 6. Check proof links
  const hasProof =
    vault.proof_links.some((p) => p.url) ||
    vault.projects.some((p) => p.github_url || p.live_url || p.case_study_url) ||
    vault.skills.some((s) => s.proof_links && s.proof_links.length > 0) ||
    vault.certificates.some((c) => c.credential_url);
    
  if (!hasProof) {
    warnings.push("You have no proof links (GitHub, live demos, certificates). Your resume might be seen as weak.");
  }

  // 7. Check for placeholder/demo content
  const stringifiedVault = JSON.stringify(vault).toLowerCase();
  if (
    stringifiedVault.includes("project added during onboarding") ||
    stringifiedVault.includes("add details in career vault") ||
    stringifiedVault.includes("demo@example.com") ||
    stringifiedVault.includes("lorem ipsum")
  ) {
    blockingIssues.push("Career Memory contains placeholder or demo content. Please replace it with your real details.");
  }

  return {
    canGenerate: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    questionsToAsk: questionsToAsk.slice(0, 1), // Ask only one next question
  };
}
