import type { CareerProfile } from "./types";

const MUTATION_WORDS = /\b(?:add|update|change|correct|replace|remove|delete|forget|store|save|log|build|create|generate|rewrite|improve|tailor|edit|set|clear|refresh)\b/i;
const MEMORY_READ_PHRASES = /(?:\b(?:show|tell|list|summari[sz]e|display|review|recap)\b[^.!?\n]{0,100}\b(?:career\s+memory|what\s+you\s+(?:know|remember)|stored|saved)\b|\bwhat\s+(?:do|did)\s+you\s+(?:currently\s+)?(?:know|remember)\s+about\s+me\b|\bwhat\s+is\s+(?:currently\s+)?(?:in|stored\s+in)\s+(?:my\s+)?career\s+memory\b|\beverything\s+you\s+(?:currently\s+)?know\s+about\s+me\b)/i;
const FACT_READ_PHRASES = /(?:\bwhat\s+(?:university|college|school|institution)\s+do\s+i\s+(?:attend|go\s+to)\b|\bwhere\s+do\s+i\s+(?:study|go\s+to\s+(?:college|university|school))\b|\bwhat\s+(?:is|was)\s+my\s+(?:current\s+)?(?:cgpa|gpa|grade|score)\b|\b(?:what\s+are\s+my\s+skills|list\s+(?:every|all|my)\s+skills?|list\s+every\s+skill\s+you\s+(?:currently\s+)?know\s+about\s+me)\b|\bwhat\s+(?:projects?|certifications?|achievements?|experience|education)\s+do\s+i\s+have\b|\bwhat\s+(?:was|is)\s+my\s+(?:internship|work)\s+(?:duration|dates?)\b|\bwhen\s+did\s+i\s+(?:work|intern)\s+at\b|\bwhat\s+(?:measurable\s+)?impact\s+did\s+i\s+have\b|\btell\s+me\s+what\s+you\s+remember\s+about\s+my\b)/i;

/**
 * Read-only Career Memory questions must never reach mutation handlers or burn
 * AI quota. Explicit write verbs always win; source-backed recall questions are
 * answered deterministically from the stored CareerProfile.
 */
export function isReadOnlyCareerMemoryQuery(message: string) {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text || MUTATION_WORDS.test(text)) return false;
  return MEMORY_READ_PHRASES.test(text) || FACT_READ_PHRASES.test(text);
}

function line(value?: string | null) {
  return String(value || "").trim();
}

function joined(values: Array<string | undefined | null>, separator = ", ") {
  return values.map(line).filter(Boolean).join(separator);
}

function unique(values: Array<string | undefined | null>) {
  return [...new Set(values.map(line).filter(Boolean))];
}

function dateRange(start?: string, end?: string) {
  return joined([start, end], " – ");
}

function findMentionedExperience(message: string, profile: CareerProfile) {
  const text = message.toLowerCase();
  return profile.experience.find((item) => item.company && text.includes(item.company.toLowerCase()));
}

function findMentionedProject(message: string, profile: CareerProfile) {
  const text = message.toLowerCase();
  return profile.projects.find((item) => item.name && text.includes(item.name.toLowerCase()));
}

/** Answer common Career Memory lookups without an LLM or any mutation. */
export function answerCareerMemoryQuery(message: string, profile: CareerProfile | null | undefined) {
  if (!profile) return "Career Memory is empty. Add your education, experience, projects, skills, or goals first.";
  const text = message.replace(/\s+/g, " ").trim().toLowerCase();

  if (/\b(?:university|college|school|institution)\b/.test(text) && /\b(?:attend|study|go to)\b/.test(text)) {
    const institutions = unique(profile.education.map((item) => item.institution));
    return institutions.length
      ? `Your stored education institution${institutions.length > 1 ? "s are" : " is"}: ${institutions.join(", ")}.`
      : "Career Memory does not currently contain an education institution.";
  }

  if (/\b(?:cgpa|gpa|grade|score)\b/.test(text)) {
    const grades = unique(profile.education.map((item) => item.grade));
    return grades.length
      ? `Your stored academic score${grades.length > 1 ? "s are" : " is"}: ${grades.join(", ")}.`
      : "Career Memory does not currently contain a CGPA, GPA, grade, or academic score.";
  }

  if (/\bskills?\b/.test(text) && /\b(?:what|list|know|remember)\b/.test(text)) {
    const skills = unique(profile.skills.map((item) => item.name));
    return skills.length
      ? `Skills currently stored in Career Memory: ${skills.join(", ")}.`
      : "Career Memory does not currently contain any skills.";
  }

  if (/\bcertifications?\b/.test(text)) {
    const certifications = profile.certifications.map((item) => joined([item.name, item.issuer])).filter(Boolean);
    return certifications.length
      ? `Certifications currently stored in Career Memory:\n${certifications.map((item) => `- ${item}`).join("\n")}`
      : "Career Memory does not currently contain any certifications.";
  }

  if (/\bprojects?\b/.test(text) && /\b(?:what|list|have|remember)\b/.test(text)) {
    const projects = profile.projects.map((item) => item.name).filter(Boolean);
    return projects.length
      ? `Projects currently stored in Career Memory: ${projects.join(", ")}.`
      : "Career Memory does not currently contain any projects.";
  }

  const mentionedExperience = findMentionedExperience(message, profile);
  const internship = mentionedExperience || profile.experience.find((item) => /\bintern(?:ship)?\b/i.test(`${item.title} ${item.description || ""}`));
  if (internship && /\b(?:duration|dates?|when)\b/.test(text)) {
    const dates = dateRange(internship.startDate, internship.endDate);
    const identity = joined([internship.title, internship.company]);
    return dates
      ? `${identity || "Your stored experience"} is recorded as ${dates}.`
      : `${identity || "That experience"} is stored, but Career Memory does not contain exact start and end dates.`;
  }

  if (/\b(?:measurable\s+)?impact\b/.test(text)) {
    const relevant = internship || profile.experience[0];
    if (!relevant) return "Career Memory does not currently contain experience impact evidence.";
    const evidence = unique([
      ...(relevant.metrics || []),
      ...relevant.achievements.flatMap((item) => [item.text, item.metric, item.impact]),
      ...relevant.responsibilities.filter((item) => /\d|%|seconds?|minutes?|hours?|users?|customers?|engineers?|reduced|increased|improved|optimized/i.test(item)),
      ...(relevant.businessImpact || []),
    ]);
    return evidence.length
      ? `Measurable impact currently stored for ${joined([relevant.title, relevant.company]) || "your experience"}:\n${evidence.map((item) => `- ${item}`).join("\n")}`
      : `Career Memory contains ${joined([relevant.title, relevant.company]) || "that experience"}, but no measurable impact evidence is currently stored.`;
  }

  if (mentionedExperience) {
    const details = unique([
      dateRange(mentionedExperience.startDate, mentionedExperience.endDate),
      mentionedExperience.description,
      ...mentionedExperience.responsibilities,
      ...(mentionedExperience.metrics || []),
      ...mentionedExperience.achievements.map((item) => item.text),
      ...mentionedExperience.technologies,
    ]);
    return `${joined([mentionedExperience.title, mentionedExperience.company]) || mentionedExperience.company}${details.length ? `:\n${details.map((item) => `- ${item}`).join("\n")}` : " is stored in Career Memory."}`;
  }

  const mentionedProject = findMentionedProject(message, profile);
  if (mentionedProject) {
    const details = unique([
      mentionedProject.description,
      ...mentionedProject.technologies,
      ...(mentionedProject.metrics || []),
      ...mentionedProject.achievements.map((item) => item.text),
    ]);
    return `${mentionedProject.name}${details.length ? `:\n${details.map((item) => `- ${item}`).join("\n")}` : " is stored in Career Memory."}`;
  }

  return formatCareerMemorySnapshot(profile);
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
      return `- ${joined([qualification, item.institution, dates, item.grade])}`;
    }).join("\n")}`);
  }

  if (profile.experience.length) {
    sections.push(`\nExperience\n${profile.experience.map((item) => {
      const details = [...item.responsibilities, ...item.achievements.map((achievement) => achievement.text)].filter(Boolean);
      return `- ${joined([item.title, item.company, dateRange(item.startDate, item.endDate)])}${details.length ? `: ${details.join("; ")}` : ""}`;
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
