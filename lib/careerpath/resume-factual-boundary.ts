import type { CareerPathResumeContent, CareerProfile } from "./types";

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Final identity-level truth boundary for resume content.
 *
 * Generative operations may rewrite wording, but they may never create a skill
 * or employment identity that is not already present in the source-gated
 * CareerProfile. In particular, job-description requirements are optimization
 * targets, not candidate facts.
 */
export function enforceResumeFactualIdentityBoundary(
  content: CareerPathResumeContent,
  profile: CareerProfile,
) {
  const allowedSkills = new Set(profile.skills.map((item) => normalize(item.name)).filter(Boolean));
  const skills = content.skills
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedSkills.has(normalize(item))),
    }))
    .filter((group) => group.items.length > 0);

  const allowedExperience = profile.experience.map((item) => ({
    company: normalize(item.company),
    title: normalize(item.title),
  }));
  const experience = content.experience.filter((item) => {
    const company = normalize(item.company);
    const role = normalize(item.role);
    if (!company || !role) return false;
    return allowedExperience.some((source) => source.company === company && source.title === role);
  });

  return {
    ...content,
    skills,
    experience,
  };
}
