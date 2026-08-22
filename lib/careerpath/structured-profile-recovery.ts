import { extractKnownSkills } from "./domain/skills";
import type { CareerPathProfile } from "./types";

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%@:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value: string) {
  return value.replace(/^\s*[-•]\s*/, "").replace(/[\s,;:.!?]+$/g, "").trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneProfile(profile: CareerPathProfile): CareerPathProfile {
  return {
    ...profile,
    personal: { ...profile.personal },
    target: { ...profile.target },
    education: profile.education.map((item) => ({ ...item })),
    skills: {
      programming: [...profile.skills.programming],
      frameworks: [...profile.skills.frameworks],
      tools: [...profile.skills.tools],
      databases: [...profile.skills.databases],
      aiTools: [...profile.skills.aiTools],
      softSkills: [...profile.skills.softSkills],
    },
    projects: profile.projects.map((item) => ({
      ...item,
      techStack: [...item.techStack],
      features: [...item.features],
      links: [...item.links],
    })),
    experience: profile.experience.map((item) => ({
      ...item,
      responsibilities: [...item.responsibilities],
      achievements: [...item.achievements],
    })),
    certifications: profile.certifications.map((item) => ({ ...item })),
    achievements: [...profile.achievements],
    languages: [...profile.languages],
    confidenceNotes: [...profile.confidenceNotes],
  };
}

const SECTION_HEADING = /^(?:personal profile|career goals?|education|experience|projects?|skills|certifications?|documents?|achievements?|languages?)\s*:?\s*$/i;

function sectionBody(source: string, heading: RegExp) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => heading.test(line.trim()));
  if (start < 0) return "";
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed && SECTION_HEADING.test(trimmed)) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

function recoverEducation(next: CareerPathProfile, source: string) {
  const pursuing = source.match(
    /\b(?:i\s+am|i['’]m)\s+pursuing\s+(?:an?\s+)?((?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?))\s+(?:in\s+)?([^,.\n]{2,80}?)\s+at\s+([^,.\n]{3,120})/i,
  );
  if (!pursuing) return;

  const degree = clean(pursuing[1]);
  const field = clean(pursuing[2]);
  const institution = clean(pursuing[3]);
  const endYear = source.match(/\bexpected\s+graduation\s*:\s*(20\d{2})\b/i)?.[1]
    || source.match(/\bgraduat(?:e|ing)(?:\s+in)?\s+(20\d{2})\b/i)?.[1]
    || "";
  const score = clean(source.match(/\bcurrent\s+cgpa\s*:\s*([0-9]+(?:\.[0-9]+)?\s*\/\s*10)\b/i)?.[1] || "");

  const index = next.education.findIndex((item) =>
    normalize(item.institution) === normalize(institution)
    || (normalize(item.degree) === normalize(degree) && normalize(item.field) === normalize(field)),
  );
  const recovered = {
    institution,
    degree,
    field,
    startYear: "",
    endYear,
    score,
    location: "",
  };
  if (index < 0) next.education.push(recovered);
  else next.education[index] = {
    ...next.education[index],
    institution: next.education[index].institution || recovered.institution,
    degree: next.education[index].degree || recovered.degree,
    field: next.education[index].field || recovered.field,
    startYear: next.education[index].startYear || recovered.startYear,
    endYear: next.education[index].endYear || recovered.endYear,
    score: next.education[index].score || recovered.score,
    location: next.education[index].location || recovered.location,
  };
}

function recoverExperience(next: CareerPathProfile, source: string) {
  const body = sectionBody(source, /^experience\s*:?\s*$/i);
  if (!body) return;
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return;

  const roleCompanyIndex = lines.findIndex((line) => !/^[-•]/.test(line) && /\s+at\s+/i.test(line));
  if (roleCompanyIndex < 0) return;
  const roleCompany = lines[roleCompanyIndex].match(/^(.{2,100}?)\s+at\s+(.{2,120})$/i);
  if (!roleCompany) return;
  const role = clean(roleCompany[1]);
  const company = clean(roleCompany[2]);

  const dateLine = lines.slice(roleCompanyIndex + 1).find((line) =>
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\s+(?:to|[-–—])\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present)\s*(?:20\d{2})?/i.test(line),
  );
  const dateMatch = dateLine?.match(/^(.+?)\s+(?:to|[-–—])\s+(.+?)$/i);

  const bullets = lines
    .filter((line) => /^[-•]/.test(line))
    .map(clean)
    .filter(Boolean);
  const responsibilities = unique(bullets.filter((line) => !/\d/.test(line)));
  const achievements = unique(bullets.filter((line) => /\d/.test(line)));

  const index = next.experience.findIndex((item) =>
    normalize(item.company) === normalize(company) || normalize(item.role) === normalize(role),
  );
  const recovered = {
    company,
    role,
    startDate: clean(dateMatch?.[1] || ""),
    endDate: clean(dateMatch?.[2] || ""),
    responsibilities,
    achievements,
  };
  if (index < 0) next.experience.push(recovered);
  else next.experience[index] = {
    ...next.experience[index],
    company: next.experience[index].company || recovered.company,
    role: next.experience[index].role || recovered.role,
    startDate: next.experience[index].startDate || recovered.startDate,
    endDate: next.experience[index].endDate || recovered.endDate,
    responsibilities: unique([...next.experience[index].responsibilities, ...recovered.responsibilities]),
    achievements: unique([...next.experience[index].achievements, ...recovered.achievements]),
  };
}

type StructuredProject = CareerPathProfile["projects"][number];

function parseStructuredProjects(source: string): { projects: StructuredProject[]; body: string } {
  const body = sectionBody(source, /^projects?\s*:?\s*$/i);
  if (!body) return { projects: [], body: "" };
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const projects: StructuredProject[] = [];

  let currentName = "";
  let bullets: string[] = [];
  const flush = () => {
    if (!currentName) return;
    const cleanBullets = bullets.map(clean).filter(Boolean);
    const combined = cleanBullets.join(" ");
    const quantified = cleanBullets.filter((line) => /\d/.test(line));
    projects.push({
      name: currentName,
      description: cleanBullets[0] || "",
      techStack: extractKnownSkills(combined),
      problemSolved: "",
      features: unique(cleanBullets.slice(1).filter((line) => !quantified.includes(line))),
      impact: quantified[0] || "",
      links: [],
    });
  };

  for (const line of lines) {
    if (/^i\s+(?:do\s+not|don't|never|have\s+never)\b/i.test(line)) break;
    if (/^[-•]/.test(line)) {
      if (currentName) bullets.push(line);
      continue;
    }
    if (/^(?:during\b|built\b|used\b|added\b|integrated\b|deployed\b|implemented\b|reduced\b|improved\b)/i.test(line)) {
      if (currentName) bullets.push(line);
      continue;
    }
    if (line.endsWith(":")) continue;
    flush();
    currentName = clean(line);
    bullets = [];
  }
  flush();
  return { projects, body };
}

function recoverProjects(next: CareerPathProfile, source: string) {
  const structured = parseStructuredProjects(source);
  if (!structured.projects.length) return;
  const names = new Set(structured.projects.map((project) => normalize(project.name)));
  const experienceBody = sectionBody(source, /^experience\s*:?\s*$/i);
  const projectBullets = structured.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-•]/.test(line))
    .map(clean);

  next.projects = next.projects.filter((project) => {
    const key = normalize(project.name);
    if (names.has(key)) return true;
    if (key && normalize(experienceBody).includes(key)) return false;
    if (projectBullets.some((bullet) => normalize(bullet).includes(key) && key.length >= 8)) return false;
    return true;
  });

  for (const project of structured.projects) {
    const index = next.projects.findIndex((item) => normalize(item.name) === normalize(project.name));
    if (index < 0) next.projects.push(project);
    else next.projects[index] = {
      ...next.projects[index],
      name: next.projects[index].name || project.name,
      description: next.projects[index].description || project.description,
      techStack: unique([...next.projects[index].techStack, ...project.techStack]),
      problemSolved: next.projects[index].problemSolved || project.problemSolved,
      features: unique([...next.projects[index].features, ...project.features]),
      impact: next.projects[index].impact || project.impact,
      links: unique([...next.projects[index].links, ...project.links]),
    };
  }
}

/**
 * Recover high-confidence facts from common resume/profile section formatting.
 * This intentionally runs from append-only user-authored raw notes, never from
 * model output, and exists to complement the prose-oriented fallback parser.
 */
export function recoverStructuredProfileEvidence(profile: CareerPathProfile): CareerPathProfile {
  const source = [profile.rawNotes, profile.existingResumeText].filter(Boolean).join("\n\n");
  if (!source.trim()) return profile;
  const next = cloneProfile(profile);
  recoverEducation(next, source);
  recoverExperience(next, source);
  recoverProjects(next, source);
  return next;
}
