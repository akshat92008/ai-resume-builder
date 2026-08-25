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

function sentenceCase(value: string) {
  const cleaned = clean(value.replace(/^\s*i\s+/i, ""));
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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

function canonicalDegree(value: string) {
  const key = normalize(value).replace(/\s+/g, "");
  if (key === "b.tech" || key === "btech") return "B.Tech";
  if (key === "m.tech" || key === "mtech") return "M.Tech";
  return clean(value);
}

function recoverPersonal(next: CareerPathProfile, source: string) {
  if (next.personal.name) return;
  const explicit = source.match(/\b(?:my name is|i am called|i['’]m called)\s+([a-z][a-z .'-]{1,70}?)(?=[,.!?\n]|$)/i)?.[1];
  const conversational = source.match(/\bI\s+am\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*,|\s+and\b|[.!?\n]|$)/)?.[1]
    || source.match(/\bI['’]m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*,|\s+and\b|[.!?\n]|$)/)?.[1];
  const name = clean(explicit || conversational || "");
  if (name) next.personal.name = name;
}

function educationScore(source: string) {
  const explicit = source.match(/\b(?:current\s+)?(?:cgpa|gpa)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*10)?)/i)?.[1];
  if (explicit) {
    const score = clean(explicit).replace(/\s+/g, "");
    return score.includes("/") ? score : `${score}/10`;
  }
  const reversed = source.match(/\b(?:with\s+(?:an?\s+)?)?([0-9]+(?:\.[0-9]+)?)\s*(?:\/\s*10\s*)?CGPA\b/i)?.[1];
  return reversed ? `${clean(reversed)}/10` : "";
}

function mergeEducation(next: CareerPathProfile, recovered: CareerPathProfile["education"][number]) {
  const index = next.education.findIndex((item) =>
    (recovered.institution && normalize(item.institution) === normalize(recovered.institution))
    || (recovered.degree && normalize(item.degree) === normalize(recovered.degree) && normalize(item.field) === normalize(recovered.field)),
  );
  if (index < 0) {
    next.education.push(recovered);
    return;
  }
  next.education[index] = {
    ...next.education[index],
    institution: recovered.institution || next.education[index].institution,
    degree: recovered.degree || next.education[index].degree,
    field: recovered.field || next.education[index].field,
    startYear: recovered.startYear || next.education[index].startYear,
    endYear: recovered.endYear || next.education[index].endYear,
    score: recovered.score || next.education[index].score,
    location: next.education[index].location || recovered.location,
  };
}

function recoverEducation(next: CareerPathProfile, source: string) {
  const student = source.match(
    /\b((?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?))\s+(?:in\s+)?([^,.\n]{2,80}?)\s+student\s+at\s+([^,.\n]{3,120}?)(?=\s+from\s+20\d{2}\b|\s+between\s+20\d{2}\b|\s+with\s+(?:an?\s+)?[0-9]|\s*[,.;]|\n|$)/i,
  );
  const pursuing = source.match(
    /\b(?:i\s+am|i['’]m)\s+pursuing\s+(?:an?\s+)?((?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?))\s+(?:in\s+)?([^,.\n]{2,80}?)\s+at\s+([^,.\n]{3,120}?)(?=\s+from\s+20\d{2}\b|\s+with\s+(?:an?\s+)?[0-9]|\s*[,.;]|\n|$)/i,
  );
  const match = student || pursuing;
  if (!match) return;

  const degree = canonicalDegree(match[1]);
  const field = clean(match[2]);
  const institution = clean(match[3]);
  const yearRange = source.match(/\bfrom\s+(20\d{2})\s+(?:to|[-–—])\s+(20\d{2})\b/i)
    || source.match(/\b(20\d{2})\s*[-–—]\s*(20\d{2})\b/i);
  const endYear = yearRange?.[2]
    || source.match(/\bexpected\s+graduation\s*:\s*(20\d{2})\b/i)?.[1]
    || source.match(/\bgraduat(?:e|ing)(?:\s+in)?\s+(20\d{2})\b/i)?.[1]
    || "";

  mergeEducation(next, {
    institution,
    degree,
    field,
    startYear: yearRange?.[1] || "",
    endYear,
    score: educationScore(source),
    location: "",
  });
}

function splitActionClauses(value: string) {
  const verbs = "built|created|developed|designed|implemented|integrated|reduced|improved|increased|worked|wrote|automated|delivered|launched|tested";
  return value
    .replace(/^\s*i\s+/i, "")
    .split(new RegExp(`\\s*,\\s*(?=(?:${verbs})\\b)|\\s*,?\\s+and\\s+(?=(?:${verbs})\\b)`, "i"))
    .map(sentenceCase)
    .filter(Boolean);
}

function internshipContext(source: string) {
  return clean(source.match(/\bDuring\s+the\s+internship\s+([\s\S]+?)(?=\n\s*\n|$)/i)?.[1] || "");
}

function mergeExperience(next: CareerPathProfile, recovered: CareerPathProfile["experience"][number]) {
  const index = next.experience.findIndex((item) =>
    (recovered.company && normalize(item.company) === normalize(recovered.company))
    || (recovered.role && normalize(item.role) === normalize(recovered.role)),
  );
  if (index < 0) {
    next.experience.push(recovered);
    return;
  }
  next.experience[index] = {
    ...next.experience[index],
    company: recovered.company || next.experience[index].company,
    role: recovered.role || next.experience[index].role,
    startDate: recovered.startDate || next.experience[index].startDate,
    endDate: recovered.endDate || next.experience[index].endDate,
    responsibilities: unique([...next.experience[index].responsibilities, ...recovered.responsibilities]),
    achievements: unique([...next.experience[index].achievements, ...recovered.achievements]),
  };
}

function recoverNaturalExperience(next: CareerPathProfile, source: string) {
  const dated = /\b(?:i\s+)?worked\s+as\s+(?:an?\s+)?([^,.!\n]{2,100}?)\s+at\s+([^,.!\n]{2,120}?)\s+from\s+((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}|20\d{4})\s+(?:to|[-–—])\s+((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2})|20\d{4}|present|current)\b/gi;
  const matches = [...source.matchAll(dated)];
  if (!matches.length) return;

  const context = matches.length === 1 ? internshipContext(source) : "";
  const clauses = context ? splitActionClauses(context) : [];
  const responsibilities = clauses.filter((line) => !/\d/.test(line));
  const achievements = clauses.filter((line) => /\d/.test(line));

  for (const match of matches) {
    mergeExperience(next, {
      company: clean(match[2]),
      role: clean(match[1]),
      startDate: clean(match[3]),
      endDate: clean(match[4]),
      responsibilities,
      achievements,
    });
  }
}

function recoverExperience(next: CareerPathProfile, source: string) {
  const body = sectionBody(source, /^experience\s*:?\s*$/i);
  if (body) {
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const roleCompanyIndex = lines.findIndex((line) => !/^[-•]/.test(line) && /\s+at\s+/i.test(line));
    if (roleCompanyIndex >= 0) {
      const roleCompany = lines[roleCompanyIndex].match(/^(.{2,100}?)\s+at\s+(.{2,120})$/i);
      if (roleCompany) {
        const role = clean(roleCompany[1]);
        const company = clean(roleCompany[2]);
        const dateLine = lines.slice(roleCompanyIndex + 1).find((line) =>
          /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\s+(?:to|[-–—])\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Present)\s*(?:20\d{2})?/i.test(line),
        );
        const dateMatch = dateLine?.match(/^(.+?)\s+(?:to|[-–—])\s+(.+?)$/i);
        const bullets = lines.filter((line) => /^[-•]/.test(line)).map(clean).filter(Boolean);
        mergeExperience(next, {
          company,
          role,
          startDate: clean(dateMatch?.[1] || ""),
          endDate: clean(dateMatch?.[2] || ""),
          responsibilities: unique(bullets.filter((line) => !/\d/.test(line))),
          achievements: unique(bullets.filter((line) => /\d/.test(line))),
        });
      }
    }
  }

  recoverNaturalExperience(next, source);
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

function mergeProject(next: CareerPathProfile, project: StructuredProject) {
  const index = next.projects.findIndex((item) => normalize(item.name) === normalize(project.name));
  if (index < 0) {
    next.projects.push(project);
    return;
  }
  next.projects[index] = {
    ...next.projects[index],
    name: project.name || next.projects[index].name,
    description: project.description || next.projects[index].description,
    techStack: unique([...next.projects[index].techStack, ...project.techStack]),
    problemSolved: project.problemSolved || next.projects[index].problemSolved,
    features: unique([...next.projects[index].features, ...project.features]),
    impact: project.impact || next.projects[index].impact,
    links: unique([...next.projects[index].links, ...project.links]),
  };
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

  for (const project of structured.projects) mergeProject(next, project);
}

function naturalProjectCandidates(source: string) {
  const candidates: Array<{ project: StructuredProject; evidence: string }> = [];
  for (const rawParagraph of source.split(/\n\s*\n/)) {
    const paragraph = rawParagraph.replace(/\s+/g, " ").trim();
    const match = paragraph.match(/^(?:i\s+)?(?:also\s+)?built\s+([A-Z][A-Za-z0-9_-]{1,60})\s*,\s*(.+)$/i);
    if (!match) continue;
    const name = clean(match[1]);
    if (!name || /^(?:with|using|built|created|developed)$/i.test(name)) continue;
    const remainder = match[2].trim();
    const sentences = (remainder.match(/[^.!?]+[.!?]?/g) || []).map(clean).filter(Boolean);
    const description = sentenceCase(sentences[0] || remainder);
    const featureSentences = sentences.slice(1)
      .filter((sentence) => /^(?:it|this)\s+(?:includes?|supports?|provides?|enables?)\b/i.test(sentence))
      .map(sentenceCase);
    const quantified = sentences.filter((sentence) => /\d/.test(sentence));
    candidates.push({
      evidence: paragraph,
      project: {
        name,
        description,
        techStack: extractKnownSkills(paragraph),
        problemSolved: "",
        features: unique(featureSentences.filter((sentence) => !quantified.includes(sentence))),
        impact: quantified[0] ? sentenceCase(quantified[0]) : "",
        links: [],
      },
    });
  }
  return candidates;
}

function recoverNaturalProjects(next: CareerPathProfile, source: string) {
  const candidates = naturalProjectCandidates(source);
  if (!candidates.length) return;
  const canonicalNames = new Set(candidates.map(({ project }) => normalize(project.name)));
  const canonicalEvidence = candidates.map(({ evidence }) => normalize(evidence));
  const experienceEvidence = normalize(internshipContext(source));

  next.projects = next.projects.filter((project) => {
    const key = normalize(project.name);
    if (!key) return false;
    if (canonicalNames.has(key)) return true;
    if (/^(?:with|using)\b/i.test(project.name.trim())) return false;
    if (experienceEvidence && key.length >= 8 && experienceEvidence.includes(key)) return false;
    if (key.length >= 8 && canonicalEvidence.some((paragraph) => paragraph.includes(key))) return false;
    return true;
  });

  for (const { project } of candidates) mergeProject(next, project);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionsTerm(sentence: string, term: string) {
  const escaped = escapeRegExp(term);
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.])`, "i").test(sentence);
}

function negativeOnlyMention(term: string, source: string) {
  const mentions = source
    .split(/[.!?]\s+|\r?\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && mentionsTerm(sentence, term));
  if (!mentions.length) return false;
  const negative = /\b(?:do\s+not|don't|never|no\s+professional|have\s+no\s+professional|not\s+familiar|without)\b/i;
  return mentions.every((sentence) => negative.test(sentence));
}

function removeNegatedSkills(next: CareerPathProfile, source: string) {
  next.skills.programming = next.skills.programming.filter((skill) => !negativeOnlyMention(skill, source));
  next.skills.frameworks = next.skills.frameworks.filter((skill) => !negativeOnlyMention(skill, source));
  next.skills.tools = next.skills.tools.filter((skill) => !negativeOnlyMention(skill, source));
  next.skills.databases = next.skills.databases.filter((skill) => !negativeOnlyMention(skill, source));
  next.skills.aiTools = next.skills.aiTools.filter((skill) => !negativeOnlyMention(skill, source));
}

/**
 * Recover high-confidence facts from both common section formatting and normal
 * first-person career prose. This runs only from append-only user-authored raw
 * notes / resume text after the primary evidence gate, so it can repair weak
 * extractor output without turning model guesses or job-description text into
 * Career Memory facts.
 */
export function recoverStructuredProfileEvidence(profile: CareerPathProfile): CareerPathProfile {
  const source = [profile.rawNotes, profile.existingResumeText].filter(Boolean).join("\n\n");
  if (!source.trim()) return profile;
  const next = cloneProfile(profile);
  recoverPersonal(next, source);
  recoverEducation(next, source);
  recoverExperience(next, source);
  recoverProjects(next, source);
  recoverNaturalProjects(next, source);
  removeNegatedSkills(next, source);
  return next;
}
