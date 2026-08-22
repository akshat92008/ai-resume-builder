import type { CareerProfile } from "./types";

const MUTATION_WORDS = /\b(?:add|update|change|correct|replace|remove|delete|forget|store|save|log|build|create|generate|rewrite|improve|tailor|edit|set|clear|refresh)\b/i;
const MEMORY_READ_PHRASES = /(?:\b(?:show|tell|list|summari[sz]e|display|review|recap)\b[^.!?\n]{0,100}\b(?:career\s+memory|what\s+you\s+(?:know|remember)|stored|saved)\b|\bwhat\s+(?:do|did)\s+you\s+(?:currently\s+)?(?:know|remember)\s+about\s+me\b|\bwhat\s+is\s+(?:currently\s+)?(?:in|stored\s+in)\s+(?:my\s+)?career\s+memory\b|\beverything\s+you\s+(?:currently\s+)?know\s+about\s+me\b)/i;

/**
 * Read-only Career Memory questions must never be allowed to reach mutation
 * handlers. Keep the grammar deliberately conservative: explicit write verbs
 * always win, while ordinary requests to show/list/summarize stored facts are
 * treated as reads.
 */
export function isReadOnlyCareerMemoryQuery(message: string) {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text || MUTATION_WORDS.test(text)) return false;
  return MEMORY_READ_PHRASES.test(text);
}

function line(value?: string | null) {
  return String(value || "").trim();
}

function joined(values: Array<string | undefined | null>, separator = ", ") {
  return values.map(line).filter(Boolean).join(separator);
}

/** Produce a source-backed, non-generative snapshot of Career Memory. */
export function formatCareerMemorySnapshot(profile: CareerProfile | null | undefined) {
  if (!profile) return "Career Memory is empty. Add your education, experience, projects, skills, or goals first.";

  const sections: string[] = ["Here is what is currently stored in Career Memory. I did not change anything:"];
  const personal = joined([
    profile.personal.fullName,
    profile.personal.email,
    profile.personal.phone,
    profile.personal.location,
    profile.personal.linkedin,
    profile.personal.github,
    profile.personal.portfolio,
  ]);
  if (personal) sections.push(`\nPersonal\n${personal}`);

  const targets = joined([
    profile.target.targetRoles.length ? profile.target.targetRoles.join(", ") : "",
    profile.target.targetIndustries.length ? profile.target.targetIndustries.join(", ") : "",
    profile.target.targetLocations.length ? profile.target.targetLocations.join(", ") : "",
  ]);
  if (targets) sections.push(`\nTargets\n${targets}`);

  if (profile.education.length) {
    sections.push(`\nEducation\n${profile.education.map((item) => {
      const qualification = joined([item.degree, item.field || item.branch], " ");
      const dates = joined([item.startDate, item.endDate], " – ");
      return `- ${joined([qualification, item.institution, dates])}`;
    }).join("\n")}`);
  }

  if (profile.experience.length) {
    sections.push(`\nExperience\n${profile.experience.map((item) => {
      const details = [...item.responsibilities, ...item.achievements.map((achievement) => achievement.text)].filter(Boolean);
      return `- ${joined([item.title, item.company])}${details.length ? `: ${details.join("; ")}` : ""}`;
    }).join("\n")}`);
  }

  if (profile.projects.length) {
    sections.push(`\nProjects\n${profile.projects.map((item) => {
      const details = [item.description, ...(item.technologies || [])].filter(Boolean);
      return `- ${item.name}${details.length ? `: ${details.join("; ")}` : ""}`;
    }).join("\n")}`);
  }

  if (profile.skills.length) sections.push(`\nSkills\n${profile.skills.map((item) => item.name).filter(Boolean).join(", ")}`);
  if (profile.achievements.length) sections.push(`\nAchievements\n${profile.achievements.map((item) => `- ${item.text}`).join("\n")}`);
  if (profile.certifications.length) sections.push(`\nCertifications\n${profile.certifications.map((item) => `- ${joined([item.name, item.issuer])}`).join("\n")}`);

  return sections.join("\n");
}
