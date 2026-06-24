import type { UserVault } from "@/lib/types";
import type { JobFitAgentResult, ProofAuditResult } from "./types";
import { clampScore, cleanText, hasAnyProjectProof, jobFitBand, skillNamesFromVault, unique } from "./utils";

const KNOWN_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "Python",
  "Java",
  "SQL",
  "Postgres",
  "MongoDB",
  "Supabase",
  "Firebase",
  "Tailwind",
  "HTML",
  "CSS",
  "REST API",
  "GraphQL",
  "AWS",
  "Docker",
  "Git",
  "GitHub",
  "Figma",
  "Excel",
  "Power BI",
  "Machine Learning",
  "AI",
  "OpenAI",
  "Gemini",
  "NVIDIA",
  "Analytics",
  "SEO",
  "Communication",
];

function extractRequiredSkills(jobDescription: string) {
  const lower = jobDescription.toLowerCase();
  return unique(KNOWN_SKILLS.filter((skill) => lower.includes(skill.toLowerCase())));
}

function skillMatches(requiredSkill: string, userSkill: string) {
  const required = requiredSkill.toLowerCase().replace(/\s+/g, "");
  const user = userSkill.toLowerCase().replace(/\s+/g, "");
  return user.includes(required) || required.includes(user);
}

export function analyzeJobFit(vault: UserVault, jobDescription = "", proofAudit?: ProofAuditResult | null): JobFitAgentResult {
  const requiredSkills = extractRequiredSkills(jobDescription);
  const userSkills = skillNamesFromVault(vault);
  const matchingSkills = requiredSkills.filter((skill) => userSkills.some((userSkill) => skillMatches(skill, userSkill)));
  const missingSkills = requiredSkills.filter((skill) => !matchingSkills.includes(skill));

  const recommendedProjects = vault.projects
    .filter((project) =>
      project.tech_stack.some((tech) => matchingSkills.some((skill) => skillMatches(skill, tech))) ||
      matchingSkills.some((skill) => `${project.title} ${project.short_description} ${project.problem_solved}`.toLowerCase().includes(skill.toLowerCase())),
    )
    .sort((a, b) => Number(hasAnyProjectProof(b)) - Number(hasAnyProjectProof(a)))
    .map((project) => project.id)
    .slice(0, 3);

  const baseSkillScore = requiredSkills.length === 0 ? 45 : (matchingSkills.length / requiredSkills.length) * 70;
  const proofBonus = proofAudit ? Math.min(20, proofAudit.proofScore * 0.2) : 0;
  const projectBonus = recommendedProjects.length > 0 ? 10 : 0;
  const jobFitScore = clampScore(baseSkillScore + proofBonus + projectBonus);

  const targetRole = vault.profile.target_roles[0] || "this role";
  const bestProject = recommendedProjects[0]
    ? vault.projects.find((project) => project.id === recommendedProjects[0])
    : vault.projects[0];

  const gapAnalysis = [
    matchingSkills.length
      ? `Your vault matches ${matchingSkills.slice(0, 5).join(", ")} from the job description.`
      : "The job description does not clearly match your current listed skills yet.",
    missingSkills.length
      ? `You should not claim ${missingSkills.slice(0, 5).join(", ")} unless you add real proof.`
      : "No major skill gaps were detected from the provided job description.",
    bestProject
      ? `${bestProject.title} is the best project to highlight, but it needs visible proof if recruiters should trust it.`
      : "Add at least one project before applying.",
  ];

  const proofWarnings = [
    ...(proofAudit?.weakClaims.slice(0, 4).map((claim) => `${claim} needs stronger proof before applying.`) ?? []),
    ...vault.projects
      .filter((project) => recommendedProjects.includes(project.id) && !hasAnyProjectProof(project))
      .map((project) => `${project.title} is relevant but has no GitHub, demo, screenshots, or case study link.`),
  ];

  return {
    requiredSkills: requiredSkills.length ? requiredSkills : ["Project ownership", "Problem solving", "Communication"],
    preferredSkills: ["GitHub proof", "Live demo", "Clear project features", "Role-specific resume"],
    missingSkills,
    matchingSkills,
    recommendedProjects: recommendedProjects.length ? recommendedProjects : vault.projects.slice(0, 2).map((project) => project.id),
    fitScore: jobFitScore,
    jobFitScore,
    fitLabel: jobFitBand(jobFitScore),
    resumeAngle: bestProject
      ? `Lead with ${cleanText(bestProject.title)} and connect it to ${matchingSkills.slice(0, 3).join(", ") || targetRole}.`
      : `Build one proof-backed project before applying for ${targetRole}.`,
    warnings: proofWarnings.length
      ? proofWarnings.slice(0, 5)
      : ["Fit can improve further when every major skill has project or certificate proof."],
    gapAnalysis,
    proofWarnings: proofWarnings.slice(0, 6),
    interviewPrepSuggestions: [
      "Prepare a 60-second explanation of your strongest project.",
      "Be ready to explain which features you personally built.",
      missingSkills[0] ? `Be honest about your learning plan for ${missingSkills[0]}.` : "Prepare examples for each matching skill.",
    ],
    nextActionsBeforeApplying: [
      bestProject && !hasAnyProjectProof(bestProject) ? `Add proof for ${bestProject.title}.` : "",
      missingSkills[0] ? `Do not add ${missingSkills[0]} to the resume unless you can prove it.` : "",
      "Generate a job-specific resume only after the quality check passes.",
    ].filter(Boolean),
  };
}
