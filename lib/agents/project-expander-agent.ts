import type { Project } from "@/lib/types";
import type { ProjectHealthReport } from "./types";
import { clampScore, cleanText, hasAnyProjectProof, projectHealthBand, wordCount } from "./utils";

export function expandProjectWithAgent(project: Project, targetRole = ""): ProjectHealthReport {
  const missingDetails: string[] = [];
  const targetedQuestions: string[] = [];
  const proofNeeded: string[] = [];

  let score = 0;
  if (cleanText(project.title)) score += 10;

  if (wordCount(project.short_description) >= 8) score += 20;
  else {
    missingDetails.push("Project description");
    targetedQuestions.push("What problem does this project solve?");
  }

  if (wordCount(project.problem_solved) >= 6) score += 15;
  else if (!targetedQuestions.includes("What problem does this project solve?")) {
    missingDetails.push("Problem solved");
    targetedQuestions.push("What problem does this project solve?");
  }

  if (project.tech_stack.length >= 2) score += 15;
  else {
    missingDetails.push("Tech stack");
    targetedQuestions.push("Which technologies did you use?");
  }

  if (project.features.length >= 2) score += 15;
  else {
    missingDetails.push("Features personally built");
    targetedQuestions.push("What did you personally build?");
  }

  if (cleanText(project.role)) score += 5;
  if (cleanText(project.impact)) score += 5;

  if (hasAnyProjectProof(project)) score += 20;
  else {
    missingDetails.push("GitHub, demo, screenshots, or case study proof");
    proofNeeded.push("GitHub repo", "Live demo", "Screenshots", "Short case study");
    targetedQuestions.push("Do you have GitHub, demo, screenshots, or video proof?");
  }

  const projectHealth = clampScore(score);
  const uniqueQuestions = Array.from(new Set(targetedQuestions)).slice(0, 3);

  return {
    projectId: project.id,
    title: cleanText(project.title) || "Untitled project",
    projectHealth,
    healthLabel: projectHealthBand(projectHealth),
    missingDetails: Array.from(new Set(missingDetails)).slice(0, 6),
    targetedQuestions: uniqueQuestions.length
      ? uniqueQuestions
      : [`What proof would make ${project.title || "this project"} stronger for ${targetRole || "your target role"}?`],
    suggestedStructure: {
      problemSolved: cleanText(project.problem_solved) || cleanText(project.short_description),
      features: project.features.slice(0, 5),
      techStack: project.tech_stack.slice(0, 8),
      impact: cleanText(project.impact),
      proofNeeded,
    },
    canGenerateResumeBullet:
      Boolean(cleanText(project.title)) &&
      Boolean(cleanText(project.short_description) || cleanText(project.problem_solved)) &&
      projectHealth >= 40,
  };
}
