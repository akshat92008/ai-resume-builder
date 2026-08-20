import type { CareerPathProfile } from "./types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "using", "used", "was", "were", "are", "is", "a", "an", "to", "of", "in", "on", "my", "i", "we", "our", "at", "as",
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%@:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 2 && !STOPWORDS.has(token)))];
}

function numericSignals(value: string) {
  return [...new Set(normalize(value).match(/\d+(?:\.\d+)?%?/g) || [])];
}

function equivalent(a: unknown, b: unknown) {
  const left = normalize(a);
  const right = normalize(b);
  return Boolean(left && right && left === right);
}

/**
 * New Career Memory facts must be traceable to the current user message.
 * Reworded free-form text is allowed only when it has strong token overlap and
 * every numeric signal is present verbatim in the evidence. Previously stored
 * facts are trusted because they already crossed this boundary on an earlier run.
 */
export function textSupportedByEvidence(value: string, evidence: string) {
  const candidate = normalize(value);
  const source = normalize(evidence);
  if (!candidate) return true;
  if (source.includes(candidate)) return true;

  const numbers = numericSignals(candidate);
  if (numbers.some((number) => !source.includes(number))) return false;

  const candidateTokens = tokens(candidate);
  if (!candidateTokens.length) return false;
  const matched = candidateTokens.filter((token) => source.includes(token));
  const threshold = candidateTokens.length <= 2 ? 1 : 0.6;
  return matched.length / candidateTokens.length >= threshold;
}

function existingString(value: string | undefined | null, existing: string | undefined | null, evidence: string) {
  if (!value) return existing || "";
  if (existing && equivalent(value, existing)) return value;
  return textSupportedByEvidence(value, evidence) ? value : existing || "";
}

function filterStrings(values: string[], existingValues: string[], evidence: string, removed: string[], label: string) {
  const existingNormalized = new Set(existingValues.map(normalize));
  return values.filter((value) => {
    const allowed = existingNormalized.has(normalize(value)) || textSupportedByEvidence(value, evidence);
    if (!allowed) removed.push(`${label}: ${value}`);
    return allowed;
  });
}

function findEducation(existing: CareerPathProfile, candidate: CareerPathProfile["education"][number]) {
  return existing.education.find((item) =>
    (candidate.institution && equivalent(candidate.institution, item.institution)) ||
    (candidate.degree && equivalent(candidate.degree, item.degree)),
  );
}

function findProject(existing: CareerPathProfile, candidate: CareerPathProfile["projects"][number]) {
  return existing.projects.find((item) => candidate.name && equivalent(candidate.name, item.name));
}

function findExperience(existing: CareerPathProfile, candidate: CareerPathProfile["experience"][number]) {
  return existing.experience.find((item) =>
    (candidate.company && equivalent(candidate.company, item.company)) ||
    (candidate.role && equivalent(candidate.role, item.role)),
  );
}

function findCertification(existing: CareerPathProfile, candidate: CareerPathProfile["certifications"][number]) {
  return existing.certifications.find((item) => candidate.name && equivalent(candidate.name, item.name));
}

export function reconcileExtractedProfileWithEvidence(input: {
  message: string;
  existing: CareerPathProfile;
  extracted: CareerPathProfile;
}): CareerPathProfile {
  const { message, existing, extracted } = input;
  const removed: string[] = [];

  const personal = {
    name: existingString(extracted.personal.name, existing.personal.name, message) || undefined,
    email: existingString(extracted.personal.email, existing.personal.email, message) || undefined,
    phone: existingString(extracted.personal.phone, existing.personal.phone, message) || undefined,
    location: existingString(extracted.personal.location, existing.personal.location, message) || undefined,
    linkedin: existingString(extracted.personal.linkedin, existing.personal.linkedin, message) || undefined,
    github: existingString(extracted.personal.github, existing.personal.github, message) || undefined,
    portfolio: existingString(extracted.personal.portfolio, existing.personal.portfolio, message) || undefined,
  };

  const targetRole = existingString(extracted.target.role, existing.target.role, message);
  const experienceLevel = existingString(extracted.target.experienceLevel, existing.target.experienceLevel, message);
  // Industry is a derived classification from the supported target role rather
  // than a user-authored factual claim, so it may be retained from extraction.
  const industry = extracted.target.industry || existing.target.industry;

  const skills = {
    programming: filterStrings(extracted.skills.programming, existing.skills.programming, message, removed, "skill"),
    frameworks: filterStrings(extracted.skills.frameworks, existing.skills.frameworks, message, removed, "skill"),
    tools: filterStrings(extracted.skills.tools, existing.skills.tools, message, removed, "skill"),
    databases: filterStrings(extracted.skills.databases, existing.skills.databases, message, removed, "skill"),
    aiTools: filterStrings(extracted.skills.aiTools, existing.skills.aiTools, message, removed, "skill"),
    softSkills: filterStrings(extracted.skills.softSkills, existing.skills.softSkills, message, removed, "skill"),
  };

  const education = extracted.education.flatMap((item) => {
    const previous = findEducation(existing, item);
    const anchorSupported = Boolean(previous) || textSupportedByEvidence(item.institution, message) || textSupportedByEvidence(item.degree, message);
    if (!anchorSupported) {
      removed.push(`education: ${item.institution || item.degree || "unknown"}`);
      return [];
    }
    return [{
      institution: existingString(item.institution, previous?.institution, message),
      degree: existingString(item.degree, previous?.degree, message),
      field: existingString(item.field, previous?.field, message),
      startYear: existingString(item.startYear, previous?.startYear, message),
      endYear: existingString(item.endYear, previous?.endYear, message),
      score: existingString(item.score, previous?.score, message),
      location: existingString(item.location, previous?.location, message),
    }];
  });

  const projects = extracted.projects.flatMap((item) => {
    const previous = findProject(existing, item);
    if (!previous && !textSupportedByEvidence(item.name, message)) {
      removed.push(`project: ${item.name || "unknown"}`);
      return [];
    }
    return [{
      name: existingString(item.name, previous?.name, message),
      description: existingString(item.description, previous?.description, message),
      techStack: filterStrings(item.techStack, previous?.techStack || [], message, removed, `project ${item.name} tech`),
      problemSolved: existingString(item.problemSolved, previous?.problemSolved, message),
      features: filterStrings(item.features, previous?.features || [], message, removed, `project ${item.name} feature`),
      impact: existingString(item.impact, previous?.impact, message),
      links: filterStrings(item.links, previous?.links || [], message, removed, `project ${item.name} link`),
    }];
  });

  const experience = extracted.experience.flatMap((item) => {
    const previous = findExperience(existing, item);
    const anchorSupported = Boolean(previous) || textSupportedByEvidence(item.company, message) || textSupportedByEvidence(item.role, message);
    if (!anchorSupported) {
      removed.push(`experience: ${item.role || "role"} @ ${item.company || "company"}`);
      return [];
    }
    return [{
      company: existingString(item.company, previous?.company, message),
      role: existingString(item.role, previous?.role, message),
      startDate: existingString(item.startDate, previous?.startDate, message),
      endDate: existingString(item.endDate, previous?.endDate, message),
      responsibilities: filterStrings(item.responsibilities, previous?.responsibilities || [], message, removed, `experience ${item.company} responsibility`),
      achievements: filterStrings(item.achievements, previous?.achievements || [], message, removed, `experience ${item.company} achievement`),
    }];
  });

  const certifications = extracted.certifications.flatMap((item) => {
    const previous = findCertification(existing, item);
    if (!previous && !textSupportedByEvidence(item.name, message)) {
      removed.push(`certification: ${item.name || "unknown"}`);
      return [];
    }
    return [{
      name: existingString(item.name, previous?.name, message),
      issuer: existingString(item.issuer, previous?.issuer, message),
      date: existingString(item.date, previous?.date, message),
      credentialLink: existingString(item.credentialLink, previous?.credentialLink, message),
    }];
  });

  const achievements = filterStrings(extracted.achievements, existing.achievements, message, removed, "achievement");
  const languages = filterStrings(extracted.languages, existing.languages, message, removed, "language");

  const rawNotes = [existing.rawNotes, message].filter(Boolean).join("\n\n");
  const confidenceNotes = [
    ...existing.confidenceNotes,
    ...removed.slice(0, 20).map((value) => `Evidence gate removed unsupported extraction (${value}).`),
  ];

  return {
    ...extracted,
    id: existing.id,
    userId: existing.userId,
    personal,
    target: { role: targetRole, industry, experienceLevel },
    education,
    skills,
    projects,
    experience,
    certifications,
    achievements,
    languages,
    rawNotes,
    confidenceNotes,
    existingResumeText: existingString(extracted.existingResumeText, existing.existingResumeText, message) || undefined,
  };
}
