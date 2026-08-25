import { extractKnownSkills } from "./domain/skills";
import type { CareerPathProfile, CareerPathResume } from "./types";
import { legacyProfileToCareerProfile, refreshCareerProfileInsights } from "./domain/profile";

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

const SECTION_HEADING = /^(?:personal profile|career goals?|education|experience|projects?|skills|certifications?|documents?|achievements?|languages?|important negative facts?|negative facts?|important constraints?|constraints?)\s*:?\s*$/i;
const CORE_STRUCTURED_HEADING = /^(?:education|experience|projects?|skills)\s*:?\s*$/i;
const MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_RANGE = new RegExp(`^(${MONTH}\\s+20\\d{2}|20\\d{4})\\s*(?:to|[-–—])\\s*(${MONTH}\\s+20\\d{2}|20\\d{4}|present|current)$`, "i");
const ACTION_LINE = /^(?:during\b|built\b|created\b|developed\b|designed\b|implemented\b|integrated\b|reduced\b|improved\b|increased\b|worked\b|wrote\b|automated\b|delivered\b|launched\b|tested\b|used\b|added\b|deployed\b)/i;
const FEATURE_LINE = /^(?:it|this)?\s*(?:includes?|supports?|provides?|enables?|features?)\b/i;

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

function hasHeading(source: string, heading: RegExp) {
  return source.split(/\r?\n/).some((line) => heading.test(line.trim()));
}

export function looksLikeStructuredCareerProfile(source: string) {
  const coreHeadings = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => CORE_STRUCTURED_HEADING.test(line)).length;
  const directFields = source
    .split(/\r?\n/)
    .filter((line) => /^(?:name|email|phone|location|linkedin|github|portfolio)\s*:/i.test(line.trim())).length;
  return coreHeadings >= 3 || (coreHeadings >= 2 && directFields >= 1);
}

export function looksLikeComprehensiveStructuredCareerProfile(source: string) {
  return hasHeading(source, /^education\s*:?\s*$/i)
    && hasHeading(source, /^skills\s*:?\s*$/i)
    && hasHeading(source, /^experience\s*:?\s*$/i)
    && hasHeading(source, /^projects?\s*:?\s*$/i);
}

function extractProjectTech(text: string) {
  const known = extractKnownSkills(text);
  if (/\bREST\s+APIs?\b/i.test(text)) {
    return unique([...known.filter((skill) => normalize(skill) !== "api"), "REST APIs"]);
  }
  return known;
}

function canonicalDegree(value: string) {
  const key = normalize(value).replace(/\s+/g, "");
  if (key === "b.tech" || key === "btech") return "B.Tech";
  if (key === "m.tech" || key === "mtech") return "M.Tech";
  return clean(value);
}

function validEmail(value: string) {
  const candidate = clean(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

function recoverPersonal(next: CareerPathProfile, source: string) {
  const directName = source.match(/(?:^|\n)\s*Name\s*:\s*([^\n]{2,100})/i)?.[1];
  const explicit = source.match(/\b(?:my name is|i am called|i['’]m called)\s+([a-z][a-z .'-]{1,70}?)(?=[,.!?\n]|$)/i)?.[1];
  const conversational = source.match(/\bI\s+am\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*,|\s+and\b|[.!?\n]|$)/)?.[1]
    || source.match(/\bI['’]m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*,|\s+and\b|[.!?\n]|$)/)?.[1];
  const name = clean(directName || explicit || conversational || "");
  if (name && !/^(?:unknown|n\/a|none|use\b|your\b)/i.test(name)) next.personal.name = name;

  const directEmailField = source.match(/(?:^|\n)\s*Email\s*:\s*([^\n]+)/i);
  if (directEmailField) {
    const email = validEmail(directEmailField[1]);
    if (email) next.personal.email = email;
    else delete next.personal.email;
  }
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

function recoverStructuredEducation(next: CareerPathProfile, source: string) {
  const body = sectionBody(source, /^education\s*:?\s*$/i);
  if (!body) return false;
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const qualificationLine = lines.find((line) => /^(?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?)/i.test(line));
  const qualification = qualificationLine?.match(/^((?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?))\s+(?:in\s+)?([^,]{2,100}?),\s*(.{3,160})$/i);
  if (!qualification) return false;
  const yearRange = body.match(/\b(20\d{2})\s*[-–—]\s*(20\d{2})\b/);
  const recovered = {
    institution: clean(qualification[3]),
    degree: canonicalDegree(qualification[1]),
    field: clean(qualification[2]),
    startYear: yearRange?.[1] || "",
    endYear: yearRange?.[2] || "",
    score: educationScore(body),
    location: "",
  };
  next.education = [recovered];
  return true;
}

function recoverEducation(next: CareerPathProfile, source: string) {
  if (recoverStructuredEducation(next, source)) return;
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

function recoverStructuredSkills(next: CareerPathProfile, source: string) {
  const body = sectionBody(source, /^skills\s*:?\s*$/i);
  if (!body) return;
  const items = unique(body
    .split(/\r?\n/)
    .flatMap((line) => line.split(/,|;|\|/))
    .map((item) => clean(item))
    .filter((item) => item && item.length <= 60));
  if (!items.length) return;

  const programming = new Set(["python", "javascript", "typescript", "java", "go", "c", "c++", "c#", "node.js", "html", "css"]);
  const frameworks = new Set(["react", "next.js", "express", "fastapi", "tailwind css", "langchain"]);
  const databases = new Set(["postgresql", "mongodb", "redis", "sql", "supabase", "firebase"]);
  const aiTools = new Set(["openai", "nvidia nim", "machine learning"]);
  const categorized = {
    programming: [] as string[],
    frameworks: [] as string[],
    tools: [] as string[],
    databases: [] as string[],
    aiTools: [] as string[],
    softSkills: [] as string[],
  };
  for (const item of items) {
    const key = normalize(item);
    if (programming.has(key)) categorized.programming.push(item);
    else if (frameworks.has(key)) categorized.frameworks.push(item);
    else if (databases.has(key)) categorized.databases.push(item);
    else if (aiTools.has(key)) categorized.aiTools.push(item);
    else categorized.tools.push(item);
  }
  next.skills = categorized;
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
  return clean(source.match(/\bDuring\s+the\s+internship\s*:?[\s\n]+([\s\S]+?)(?=\n\s*\n|$)/i)?.[1]
    || source.match(/\bDuring\s+the\s+internship\s+([\s\S]+?)(?=\n\s*\n|$)/i)?.[1]
    || "");
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

function recoverStructuredExperience(next: CareerPathProfile, source: string) {
  const body = sectionBody(source, /^experience\s*:?\s*$/i);
  if (!body) return false;
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) => {
    if (DATE_RANGE.test(line) || /^during\s+the\s+internship\s*:?$/i.test(line) || /^[-•]/.test(line)) return false;
    return /^.{2,100}?\s+at\s+.{2,120}$/i.test(line) || /^.{2,100}?\s+[–—-]\s+.{2,120}$/.test(line);
  });
  if (headerIndex < 0) return false;
  const header = lines[headerIndex].match(/^(.{2,100}?)\s+at\s+(.{2,120})$/i)
    || lines[headerIndex].match(/^(.{2,100}?)\s+[–—-]\s+(.{2,120})$/);
  if (!header) return false;
  const dateLine = lines.slice(headerIndex + 1).find((line) => DATE_RANGE.test(line));
  const dateMatch = dateLine?.match(DATE_RANGE);
  const actionLines = lines
    .slice(headerIndex + 1)
    .filter((line) => line !== dateLine)
    .filter((line) => !/^during\s+the\s+internship\s*:?$/i.test(line))
    .map(clean)
    .filter((line) => line && ACTION_LINE.test(line));
  const cleanedActions = actionLines.map(sentenceCase);
  const recovered = {
    company: clean(header[2]),
    role: clean(header[1]),
    startDate: clean(dateMatch?.[1] || ""),
    endDate: clean(dateMatch?.[2] || ""),
    responsibilities: unique(cleanedActions.filter((line) => !/\d/.test(line))),
    achievements: unique(cleanedActions.filter((line) => /\d/.test(line))),
  };
  next.experience = [recovered];
  return true;
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
  if (recoverStructuredExperience(next, source)) return;
  recoverNaturalExperience(next, source);
}

type StructuredProject = CareerPathProfile["projects"][number];

function buildProject(name: string, detailLines: string[]): StructuredProject {
  const details = detailLines.map(clean).filter(Boolean);
  const quantified = details.filter((line) => /\d/.test(line));
  const descriptive = details.filter((line) => !FEATURE_LINE.test(line));
  const description = sentenceCase(descriptive[0] || details[0] || "");
  const features = details
    .filter((line, index) => index > 0 || line !== descriptive[0])
    .filter((line) => FEATURE_LINE.test(line) || (!ACTION_LINE.test(line) && !quantified.includes(line)))
    .map(sentenceCase);
  return {
    name: clean(name.replace(/^\d+[.)]\s*/, "")),
    description,
    techStack: extractProjectTech(details.join(" ")),
    problemSolved: "",
    features: unique(features.filter((line) => !quantified.includes(line))),
    impact: quantified[0] ? sentenceCase(quantified[0]) : "",
    links: [],
  };
}

function parseStructuredProjects(source: string): { projects: StructuredProject[]; body: string; explicitNumbered: boolean } {
  const body = sectionBody(source, /^projects?\s*:?\s*$/i);
  if (!body) return { projects: [], body: "", explicitNumbered: false };
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const explicitNumbered = lines.some((line) => /^\d+[.)]\s*\S/.test(line));
  const projects: StructuredProject[] = [];
  let currentName = "";
  let details: string[] = [];

  const flush = () => {
    if (!currentName) return;
    projects.push(buildProject(currentName, details));
    currentName = "";
    details = [];
  };

  if (explicitNumbered) {
    for (const rawLine of lines) {
      const numbered = rawLine.match(/^\d+[.)]\s*(.+)$/);
      if (numbered) {
        flush();
        currentName = clean(numbered[1]);
        continue;
      }
      if (currentName) details.push(rawLine);
    }
    flush();
    return { projects: projects.filter((project) => project.name), body, explicitNumbered };
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (/^i\s+(?:do\s+not|don't|never|have\s+never)\b/i.test(rawLine)) break;
    const isBullet = /^[-•]/.test(rawLine);
    const stripped = clean(rawLine);
    const nextLine = lines[index + 1] || "";
    const startsDetail = isBullet || ACTION_LINE.test(stripped) || FEATURE_LINE.test(stripped);
    const nextLooksLikeDetail = /^[-•]/.test(nextLine) || ACTION_LINE.test(clean(nextLine)) || FEATURE_LINE.test(clean(nextLine));

    if (!startsDetail && nextLooksLikeDetail) {
      flush();
      currentName = stripped;
      continue;
    }
    if (currentName) details.push(rawLine);
  }
  flush();
  return { projects: projects.filter((project) => project.name), body, explicitNumbered };
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
  if (!structured.projects.length) return false;
  next.projects = structured.projects.map((project) => ({ ...project }));
  return true;
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
    const sentences = remainder.split(/[.!?]\s+(?=[A-Z])/g).map(clean).filter(Boolean);
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

function cleanStructuredTopLevelAchievements(next: CareerPathProfile, source: string) {
  if (!looksLikeStructuredCareerProfile(source)) return;
  if (hasHeading(source, /^achievements?\s*:?\s*$/i)) return;
  next.achievements = [];
}

export function recoverStructuredProfileEvidence(profile: CareerPathProfile): CareerPathProfile {
  const source = [profile.rawNotes, profile.existingResumeText].filter(Boolean).join("\n\n");
  if (!source.trim()) return profile;
  const next = cloneProfile(profile);
  recoverPersonal(next, source);
  recoverEducation(next, source);
  recoverExperience(next, source);
  recoverStructuredSkills(next, source);
  const hasStructuredProjects = recoverProjects(next, source);
  if (!hasStructuredProjects) recoverNaturalProjects(next, source);
  removeNegatedSkills(next, source);
  cleanStructuredTopLevelAchievements(next, source);
  return next;
}

export function repairStructuredResumeMemorySnapshot(resume: CareerPathResume | null): CareerPathResume | null {
  if (!resume?.profile?.rawNotes || !looksLikeStructuredCareerProfile(resume.profile.rawNotes)) return resume;

  const source = resume.profile.rawNotes;
  const repairedProfile = recoverStructuredProfileEvidence(resume.profile);
  const canonical = legacyProfileToCareerProfile(repairedProfile, resume.userId, source);
  const existing = resume.careerProfile;
  if (!existing) return { ...resume, profile: repairedProfile, careerProfile: canonical };

  const hasDirectEmail = /(?:^|\n)\s*Email\s*:/i.test(source);
  const repairedCareerProfile = refreshCareerProfileInsights({
    ...existing,
    personal: {
      ...existing.personal,
      ...canonical.personal,
      fullName: canonical.personal.fullName || existing.personal.fullName,
      email: hasDirectEmail ? canonical.personal.email : existing.personal.email,
    },
    education: hasHeading(source, /^education\s*:?\s*$/i) ? canonical.education : existing.education,
    experience: hasHeading(source, /^experience\s*:?\s*$/i) ? canonical.experience : existing.experience,
    projects: hasHeading(source, /^projects?\s*:?\s*$/i) ? canonical.projects : existing.projects,
    skills: hasHeading(source, /^skills\s*:?\s*$/i) ? canonical.skills : existing.skills,
    achievements: looksLikeComprehensiveStructuredCareerProfile(source) ? canonical.achievements : existing.achievements,
  });

  return {
    ...resume,
    profile: repairedProfile,
    careerProfile: repairedCareerProfile,
  };
}
