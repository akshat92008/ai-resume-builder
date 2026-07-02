/**
 * CareerOS — LinkedIn Domain
 *
 * LinkedIn profile optimization from Career Memory.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  CareerPathResume,
  CareerProfile,
  JobDescription,
  LinkedInOptimization,
} from "../types";
import { unique } from "./utils";

// ---------------------------------------------------------------------------
// LinkedIn Optimization
// ---------------------------------------------------------------------------

export function generateLinkedInOptimization(
  profile: CareerProfile,
  resume: CareerPathResume,
  job?: JobDescription,
): LinkedInOptimization {
  const role = job?.title || resume.targetRole || profile.target.targetRoles[0] || "Career Builder";
  const skills = profile.skills.map((skill) => skill.name);
  const featured = [
    ...profile.projects.slice(0, 3).map((project) => `${project.name}${project.liveDemo ? ` - ${project.liveDemo}` : project.github ? ` - ${project.github}` : ""}`),
    ...profile.certifications.slice(0, 2).map((cert) => cert.name),
  ].filter(Boolean);
  const proof = profile.strengths.map((item) => item.title).slice(0, 2).join(" and ");
  return {
    headline: `${role} | ${skills.slice(0, 4).join(" | ") || "Project-focused career profile"}`,
    about: `I am building toward ${role} with a career memory grounded in ${proof || "projects, skills, and measurable achievements"}. My strongest evidence includes ${featured.slice(0, 2).join(", ") || "hands-on work and proof-backed learning"}.`,
    experienceUpdates: resume.content.experience.flatMap((item) => item.bullets.slice(0, 2)).slice(0, 6),
    skills: unique([...skills, ...(job?.keywords || [])]).slice(0, 25),
    featured,
    keywords: unique([role, ...(job?.keywords || []), ...skills]).slice(0, 20),
    seoNotes: [
      "Use the target role in the headline and About section.",
      "Pin strongest projects, certificates, or portfolio links in Featured.",
      "Keep skills aligned with evidence already stored in Career Memory.",
    ],
  };
}
