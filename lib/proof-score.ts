import type {
  JobAnalysis,
  ProofScoreResult,
  ProofScoreSubmission,
  Resume,
  UserVault,
} from "./types";

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function hasUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

function grade(total: number): ProofScoreResult["grade"] {
  if (total >= 85) return "Excellent";
  if (total >= 65) return "Strong";
  if (total >= 40) return "Average";
  return "Weak";
}

function nonEmpty(values: string[]) {
  return values.filter((value) => value.trim().length > 0);
}

export function submissionToVault(submission: ProofScoreSubmission): UserVault {
  const projectLines = submission.projects_text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    profile: {
      id: "proof-score-lead",
      full_name: submission.name,
      email: submission.email,
      phone: submission.whatsapp,
      city: "",
      linkedin_url: submission.linkedin_url,
      github_url: submission.github_url,
      portfolio_url: submission.portfolio_url,
      target_roles: nonEmpty([submission.target_role]),
      headline: submission.target_role ? `${submission.target_role} candidate` : "",
      summary: submission.resume_text.slice(0, 320),
      public_slug: "",
      portfolio_public: false,
      plan: "free",
    },
    education: [
      {
        id: "lead-education",
        institution: submission.college,
        degree: submission.course,
        field: "",
        start_year: 0,
        end_year: 0,
        score: "",
        coursework: [],
        achievements: "",
      },
    ],
    skills: [],
    projects: projectLines.map((line, index) => ({
      id: `lead-project-${index + 1}`,
      title: line.split("-")[0]?.trim() || `Project ${index + 1}`,
      short_description: line,
      problem_solved: "",
      target_users: "",
      tech_stack: [],
      features: [],
      impact: "",
      github_url: index === 0 ? submission.github_url : "",
      live_url: submission.portfolio_url,
      screenshots_url: "",
      case_study_url: "",
      role: "",
      start_date: "",
      end_date: "",
      status: "completed",
      tags: [],
    })),
    experiences: [],
    certificates: [],
    achievements: [],
    proof_links: nonEmpty([
      submission.github_url,
      submission.linkedin_url,
      submission.portfolio_url,
    ]).map((url, index) => ({
      id: `lead-proof-${index + 1}`,
      title: url.includes("github") ? "GitHub profile" : url.includes("linkedin") ? "LinkedIn profile" : "Portfolio link",
      url,
      type: url.includes("github") ? "github" : url.includes("linkedin") ? "linkedin_post" : "other",
      notes: "Submitted from free proof score checker",
    })),
  };
}

export function calculateProofScore(
  userVault: UserVault,
  resume: Resume | null = null,
  jobAnalysis: JobAnalysis | null = null,
): ProofScoreResult {
  const suggestions: string[] = [];
  const missingProof: string[] = [];
  const nextActions: string[] = [];
  const weakBullets: string[] = [];
  const { profile, projects } = userVault;

  let profileCompleteness = 0;
  if (profile.full_name) profileCompleteness += 3;
  if (profile.email) profileCompleteness += 3;
  if (profile.phone || profile.city) profileCompleteness += 2;
  if (hasUrl(profile.linkedin_url)) profileCompleteness += 3;
  if (hasUrl(profile.github_url) || hasUrl(profile.portfolio_url)) profileCompleteness += 3;
  if (profile.target_roles.length > 0 || profile.headline) profileCompleteness += 3;
  if (profile.summary && profile.summary.length >= 80) profileCompleteness += 3;
  profileCompleteness = clamp(profileCompleteness, 20);

  if (profileCompleteness < 14) {
    suggestions.push("Complete your name, contact details, target role, LinkedIn/GitHub links, and a specific summary.");
    nextActions.push("Finish the basic profile section in your Career Vault.");
  }

  let projectScore = 0;
  if (projects.length >= 3) projectScore += 8;
  else if (projects.length === 2) projectScore += 6;
  else if (projects.length === 1) projectScore += 3;

  const detailedProjects = projects.filter(
    (project) =>
      project.short_description &&
      project.problem_solved &&
      project.features.length >= 2 &&
      project.tech_stack.length >= 2,
  );
  projectScore += detailedProjects.length >= 2 ? 6 : detailedProjects.length === 1 ? 3 : 0;

  const impactProjects = projects.filter((project) => project.impact.trim().length > 0);
  projectScore += impactProjects.length >= 2 ? 4 : impactProjects.length === 1 ? 2 : 0;

  const roleProjects = projects.filter((project) => project.role.trim().length > 0);
  projectScore += roleProjects.length >= 2 ? 2 : roleProjects.length === 1 ? 1 : 0;
  projectScore = clamp(projectScore, 20);

  if (projectScore < 14) {
    suggestions.push("Add 2-3 detailed projects with problem solved, features, tech stack, role, and impact.");
    nextActions.push("Rewrite your top project using problem, build, tech, proof, and impact.");
  }

  let proofLinks = userVault.proof_links.filter((proof) => hasUrl(proof.url)).length;
  proofLinks += projects.filter((project) => hasUrl(project.github_url)).length;
  proofLinks += projects.filter((project) => hasUrl(project.live_url)).length;
  proofLinks += projects.filter((project) => hasUrl(project.case_study_url)).length;
  proofLinks += userVault.certificates.filter((certificate) => hasUrl(certificate.credential_url)).length;
  proofLinks += userVault.achievements.filter((achievement) => hasUrl(achievement.proof_url)).length;

  const proofLinksScore = clamp(proofLinks * 4, 20);
  const projectsWithoutProof = projects.filter(
    (project) => !hasUrl(project.github_url) && !hasUrl(project.live_url) && !hasUrl(project.case_study_url),
  );
  projectsWithoutProof.slice(0, 4).forEach((project) => {
    missingProof.push(`${project.title}: add GitHub, live demo, screenshots, or a case study.`);
  });
  userVault.skills
    .filter((skill) => skill.proof_links.length === 0)
    .slice(0, 4)
    .forEach((skill) => missingProof.push(`${skill.name}: attach a project, certificate, or public post as proof.`));

  if (proofLinksScore < 16) {
    suggestions.push("Attach proof links to important claims, especially GitHub repos, live demos, certificates, and case studies.");
    nextActions.push("Add at least one proof link to every featured project.");
  }

  let jobMatch = 10;
  if (jobAnalysis) {
    jobMatch = clamp((jobAnalysis.fitScore / 100) * 15, 15);
    if (jobAnalysis.missingSkills.length > 0) {
      suggestions.push(`Target missing JD skills honestly: ${jobAnalysis.missingSkills.slice(0, 4).join(", ")}.`);
    }
  }

  let resumeClarity = 8;
  if (resume) {
    resumeClarity = 8;
    resumeClarity += resume.content_json.summary.length >= 80 ? 3 : 0;
    resumeClarity += resume.content_json.projects.length >= 2 ? 2 : 0;
    resumeClarity += resume.warnings.length === 0 ? 2 : resume.warnings.length <= 2 ? 1 : 0;
    resume.warnings.slice(0, 4).forEach((warning) => weakBullets.push(warning.message));
  } else {
    const resumeText = `${profile.summary} ${projects.map((project) => project.short_description).join(" ")}`;
    if (/\b(passionate|hardworking|team player|quick learner|seeking opportunity)\b/i.test(resumeText)) {
      weakBullets.push("Replace generic wording like passionate, hardworking, or quick learner with specific proof.");
    }
  }
  resumeClarity = clamp(resumeClarity, 15);
  if (resumeClarity < 12) {
    suggestions.push("Make resume bullets more specific: action verb, what you built, tech used, and proof/outcome.");
  }

  let portfolioCompleteness = 0;
  if (profile.portfolio_public) portfolioCompleteness += 4;
  if (profile.public_slug) portfolioCompleteness += 2;
  if (hasUrl(profile.github_url) || hasUrl(profile.linkedin_url)) portfolioCompleteness += 2;
  if (projects.some((project) => hasUrl(project.live_url) || hasUrl(project.case_study_url))) portfolioCompleteness += 2;
  portfolioCompleteness = clamp(portfolioCompleteness, 10);
  if (portfolioCompleteness < 7) {
    suggestions.push("Publish a public proof portfolio so recruiters can verify your strongest work quickly.");
    nextActions.push("Turn your portfolio public and share the recruiter link.");
  }

  if (missingProof.length === 0) {
    missingProof.push("No major proof gaps found. Keep links current and remove any unverifiable claims.");
  }
  if (weakBullets.length === 0) {
    weakBullets.push("No obvious weak bullets detected. Keep every claim tied to a project, certificate, or link.");
  }
  if (nextActions.length < 3) {
    nextActions.push("Run a job description analysis before generating your next resume.");
    nextActions.push("Generate a proof-backed resume and print it as a PDF.");
  }

  const total =
    profileCompleteness +
    projectScore +
    proofLinksScore +
    jobMatch +
    resumeClarity +
    portfolioCompleteness;

  return {
    total: clamp(total, 100),
    grade: grade(total),
    breakdown: {
      profileCompleteness,
      projects: projectScore,
      proofLinks: proofLinksScore,
      jobMatch,
      resumeClarity,
      portfolioCompleteness,
    },
    suggestions: suggestions.slice(0, 6),
    missingProof: missingProof.slice(0, 6),
    nextActions: nextActions.slice(0, 6),
    weakBullets: weakBullets.slice(0, 5),
  };
}
