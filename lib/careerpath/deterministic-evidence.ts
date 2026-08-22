import { extractAwards, extractKnownSkills, inferIndustry } from "./domain/skills";
import { actionClaimHasAffirmativeSupport, hasUnsafeActionContext, isExplicitlyNegatedTerm } from "./source-safety";
import type { CareerPathProfile, CareerPathResumeContent } from "./types";

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%@:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function cleanFragment(value: string) {
  return value.replace(/^\s*(?:i\s+)?/i, "").replace(/[\s,;:.!?]+$/g, "").trim();
}

function sentenceCase(value: string) {
  const clean = cleanFragment(value);
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function numericSignals(value: string) {
  return unique(normalize(value).match(/\d+(?:\.\d+)?%?/g) || []);
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

function extractName(message: string) {
  const explicit = message.match(/\b(?:my name is|i am called|i['’]m called)\s+([a-z][a-z0-9 .'-]{1,80}?)(?=\s+(?:and\s+)?i\b|[,.!?]|$)/i)?.[1];
  if (explicit) return cleanFragment(explicit);
  const conversational = message.match(/\bI['’]m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s*[,.;]|\s+(?:and|a|an)\b)/)?.[1];
  return cleanFragment(conversational || "");
}

function extractTargetRole(message: string) {
  return cleanFragment(
    message.match(/\b(?:targeting|seeking|looking for)\s+(?:an?\s+)?([a-z][a-z0-9+/# .&'-]{1,100}?)(?:\s+roles?\b|[.;!?]|$)/i)?.[1] || "",
  );
}

function extractPersonalLinks(message: string) {
  return {
    github: cleanFragment(message.match(/\bgithub\s*:\s*([^\s,;]+)/i)?.[1] || ""),
    linkedin: cleanFragment(message.match(/\blinkedin\s*:\s*([^\s,;]+)/i)?.[1] || ""),
    portfolio: cleanFragment(message.match(/\bportfolio\s*:\s*([^\s,;]+)/i)?.[1] || ""),
  };
}

function extractEducation(message: string): CareerPathProfile["education"] {
  const student = message.match(/\b((?:B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?)[^,.\n]{0,70}?)\s+student\s+at\s+([^,.\n]{3,120})/i);
  if (!student) return [];
  const qualification = cleanFragment(student[1]);
  const institution = cleanFragment(student[2]);
  const degreeToken = qualification.match(/^(B\.?\s*Tech|BTech|M\.?\s*Tech|MTech|Bachelor(?:'s)?|Master(?:'s)?)/i)?.[1] || qualification;
  const field = cleanFragment(qualification.slice(degreeToken.length).replace(/^\s*(?:in\s+)?/i, ""));
  const endYear = message.match(/\bgraduat(?:e|ing)(?:\s+in)?\s+(20\d{2})\b/i)?.[1] || "";
  return [{
    institution,
    degree: cleanFragment(degreeToken),
    field,
    startYear: "",
    endYear,
    score: "",
    location: "",
  }];
}

type ExtractedExperience = CareerPathProfile["experience"][number];

function extractExperiences(message: string): ExtractedExperience[] {
  const found: ExtractedExperience[] = [];

  const withDates = /\bworked\s+at\s+([^,.!?\n]{2,100}?)\s+as\s+(?:an?\s+)?([^,.!?\n]{2,100}?)\s+from\s+([^,.!?\n]{2,30}?)\s+to\s+([^,.!?\n]{2,30}?)(?=[,.!?\n]|$)/gi;
  for (const match of message.matchAll(withDates)) {
    found.push({
      company: cleanFragment(match[1]),
      role: cleanFragment(match[2]),
      startDate: cleanFragment(match[3]),
      endDate: cleanFragment(match[4]),
      responsibilities: [],
      achievements: [],
    });
  }

  const withoutDates = /\bworked\s+at\s+([^,.!?\n]{2,100}?)\s+as\s+(?:an?\s+)?([^,.!?\n]{2,100}?)(?=[,.!?\n]|$)/gi;
  for (const match of message.matchAll(withoutDates)) {
    // The broad no-date grammar also matches the dated grammar with
    // "from 2025 to 2026" folded into the role. If the employer was already
    // recovered by the more specific dated parser, keep that canonical row.
    if (found.some((item) => normalize(item.company) === normalize(match[1]))) continue;
    found.push({
      company: cleanFragment(match[1]),
      role: cleanFragment(match[2]),
      startDate: "",
      endDate: "",
      responsibilities: [],
      achievements: [],
    });
  }

  const internships = /\bcompleted\s+(?:an?\s+)?(?:(\d+)\s*[- ]?month\s+)?([a-z][a-z &/+.-]{1,70}?)\s+internship\s+at\s+([^,.!?\n]{2,100}?)(?:\s+where\s+i\s+([^.!?\n]{2,220}))?(?=[.!?\n]|$)/gi;
  for (const match of message.matchAll(internships)) {
    const specialization = cleanFragment(match[2]).replace(/^software\s+development$/i, "Software Development");
    const company = cleanFragment(match[3]);
    const responsibility = match[4] ? sentenceCase(match[4]) : "";
    const duration = match[1] ? `Completed a ${match[1]}-month internship` : "";
    const role = /\bintern\b/i.test(specialization) ? specialization : `${specialization} Intern`;
    const existing = found.find((item) => normalize(item.company) === normalize(company));
    if (existing) {
      existing.responsibilities = unique([...existing.responsibilities, responsibility, duration].filter(Boolean));
    } else {
      found.push({
        company,
        role: sentenceCase(role),
        startDate: "",
        endDate: "",
        responsibilities: unique([responsibility, duration].filter(Boolean)),
        achievements: [],
      });
    }
  }

  const experienceClaims = extractActionClaims(message).filter((claim) => !/^(?:Built|Created)\b/i.test(claim));
  if (found.length === 1) {
    found[0].responsibilities = unique([
      ...found[0].responsibilities,
      ...experienceClaims.filter((claim) => numericSignals(claim).length === 0),
    ]);
    found[0].achievements = unique([
      ...found[0].achievements,
      ...experienceClaims.filter((claim) => numericSignals(claim).length > 0),
    ]);
  }
  return found;
}

function isSentenceBoundary(message: string, index: number) {
  const char = message[index];
  if (char === "\n") return true;
  if (!/[.!?]/.test(char || "")) return false;
  return index === message.length - 1 || /\s/.test(message[index + 1] || "");
}

function sentenceContext(message: string, index: number) {
  let start = 0;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (isSentenceBoundary(message, cursor)) {
      start = cursor + 1;
      break;
    }
  }
  let end = message.length;
  for (let cursor = index; cursor < message.length; cursor += 1) {
    if (isSentenceBoundary(message, cursor)) {
      end = cursor + (message[cursor] === "\n" ? 0 : 1);
      break;
    }
  }
  let context = message.slice(start, end).replace(/^\s*\d+[.)]\s*/, "").trim();
  const remainder = message.slice(end);
  const follow = remainder.match(/^\s*(It|This)\s+([^.!?\n]{2,220})[.!?]?/i);
  if (follow) context += ` ${follow[0].trim()}`;
  return context.trim();
}

function projectCandidates(message: string) {
  const candidates: Array<{ name: string; index: number }> = [];
  const patterns = [
    /\bbuilt\s+([A-Z][A-Za-z0-9][A-Za-z0-9 _-]{1,60}?),(?=\s+(?:an?|the)\b)/g,
    /\bbuilt\s+(?:an?\s+|the\s+)?([a-z][a-z0-9 _-]{2,70}?)(?=\s+using\b|\s+with\b|[.,\n])/gi,
    /\bcreated\s+(?:an?\s+|the\s+)?([a-z][a-z0-9 _-]{2,70}?)(?=\s+that\b|\s+which\b|\s+using\b|[.,\n])/gi,
  ];
  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      const name = cleanFragment(match[1]);
      if (!name || /^(?:profile|resume|cv)$/i.test(name)) continue;
      const index = match.index ?? 0;
      if (hasUnsafeActionContext(message, index)) continue;
      if (!candidates.some((item) => normalize(item.name) === normalize(name))) candidates.push({ name, index });
    }
  }
  return candidates.sort((a, b) => a.index - b.index);
}

function extractProjects(message: string): CareerPathProfile["projects"] {
  return projectCandidates(message).map(({ name, index }) => {
    const context = sentenceContext(message, index);
    const techStack = extractKnownSkills(context);
    const localClaims = extractActionClaims(context).filter((claim) => !/^Built\b/i.test(claim) && !/^Created\b/i.test(claim));
    const quantified = localClaims.filter((claim) => numericSignals(claim).length > 0);
    const followFeature = context.match(/\b(?:It|This)\s+(supports?|includes?|provides?|enables?)\s+([^.!?]{2,200})/i);
    return {
      name,
      description: sentenceCase(context.replace(/^I\s+/i, "")),
      techStack,
      problemSolved: "",
      features: unique([
        ...localClaims.filter((claim) => !quantified.includes(claim)),
        followFeature ? sentenceCase(`${followFeature[1]} ${followFeature[2]}`) : "",
      ].filter(Boolean)),
      impact: quantified[0] || "",
      links: [],
    };
  });
}

function extractActionClaims(message: string) {
  const claims: string[] = [];
  const pattern = /\b(?:i\s+)?(implemented|wrote|created|developed|designed|built|led|managed|improved|increased|reduced|decreased|optimized|automated|delivered|launched|tested)\s+([^,.!?;\n]{2,180})/gi;
  for (const match of message.matchAll(pattern)) {
    if (hasUnsafeActionContext(message, match.index ?? 0)) continue;
    const claim = sentenceCase(`${match[1]} ${match[2]}`);
    if (claim && actionClaimHasAffirmativeSupport(claim, message)) claims.push(claim);
  }
  return unique(claims);
}

function categorizeSkills(skills: string[]) {
  const frameworks = new Set(["react", "next.js", "express", "tailwind css", "langchain"]);
  const programming = new Set(["typescript", "javascript", "python", "node.js", "html", "css"]);
  const databases = new Set(["postgresql", "mongodb", "redis", "sql", "supabase", "firebase"]);
  const aiTools = new Set(["nvidia nim", "openai", "machine learning"]);

  return skills.reduce(
    (acc, skill) => {
      const key = normalize(skill);
      if (frameworks.has(key)) acc.frameworks.push(skill);
      else if (programming.has(key)) acc.programming.push(skill);
      else if (databases.has(key)) acc.databases.push(skill);
      else if (aiTools.has(key)) acc.aiTools.push(skill);
      else acc.tools.push(skill);
      return acc;
    },
    { programming: [] as string[], frameworks: [] as string[], tools: [] as string[], databases: [] as string[], aiTools: [] as string[] },
  );
}

function mergeEducation(next: CareerPathProfile, incoming: CareerPathProfile["education"]) {
  for (const item of incoming) {
    const index = next.education.findIndex((current) =>
      normalize(current.institution) === normalize(item.institution) ||
      (current.degree && normalize(current.degree) === normalize(item.degree) && normalize(current.field) === normalize(item.field)),
    );
    if (index < 0) next.education.push(item);
    else next.education[index] = {
      ...next.education[index],
      institution: next.education[index].institution || item.institution,
      degree: next.education[index].degree || item.degree,
      field: next.education[index].field || item.field,
      startYear: next.education[index].startYear || item.startYear,
      endYear: next.education[index].endYear || item.endYear,
      score: next.education[index].score || item.score,
      location: next.education[index].location || item.location,
    };
  }
}

/**
 * Recover high-confidence facts directly from the authenticated user's message.
 * The parser is deliberately bounded, but it preserves multiple explicit
 * education / experience / project entities and understands negation. It never
 * turns a denied or instructional statement into affirmative career evidence.
 */
export function mergeDeterministicProfileEvidence(input: {
  message: string;
  profile: CareerPathProfile;
  targetRole?: string;
}): CareerPathProfile {
  const next = cloneProfile(input.profile);
  const message = input.message.trim();
  if (!message) return next;

  const name = extractName(message);
  if (!next.personal.name && name) next.personal.name = name;
  const links = extractPersonalLinks(message);
  if (!next.personal.github && links.github) next.personal.github = links.github;
  if (!next.personal.linkedin && links.linkedin) next.personal.linkedin = links.linkedin;
  if (!next.personal.portfolio && links.portfolio) next.personal.portfolio = links.portfolio;

  const sourceTargetRole = extractTargetRole(message) || cleanFragment(input.targetRole || "");
  if (!next.target.role && sourceTargetRole) next.target.role = sourceTargetRole;
  if (!next.target.industry && (sourceTargetRole || message)) next.target.industry = inferIndustry(sourceTargetRole || message);

  const detectedSkills = categorizeSkills(extractKnownSkills(message).filter((skill) => !isExplicitlyNegatedTerm(skill, message)));
  next.skills.programming = unique([...next.skills.programming, ...detectedSkills.programming]);
  next.skills.frameworks = unique([...next.skills.frameworks, ...detectedSkills.frameworks]);
  next.skills.tools = unique([...next.skills.tools, ...detectedSkills.tools]);
  next.skills.databases = unique([...next.skills.databases, ...detectedSkills.databases]);
  next.skills.aiTools = unique([...next.skills.aiTools, ...detectedSkills.aiTools]);

  mergeEducation(next, extractEducation(message));

  for (const experience of extractExperiences(message)) {
    const existingIndex = next.experience.findIndex((item) =>
      (experience.company && normalize(item.company) === normalize(experience.company)) ||
      (experience.role && normalize(item.role) === normalize(experience.role)),
    );
    const existing = existingIndex >= 0 ? next.experience[existingIndex] : null;
    const merged = {
      company: existing?.company || experience.company,
      role: existing?.role || experience.role,
      startDate: existing?.startDate || experience.startDate,
      endDate: existing?.endDate || experience.endDate,
      responsibilities: unique([...(existing?.responsibilities || []), ...experience.responsibilities]),
      achievements: unique([...(existing?.achievements || []), ...experience.achievements]),
    };
    if (existingIndex >= 0) next.experience[existingIndex] = merged;
    else next.experience.push(merged);
  }

  for (const project of extractProjects(message)) {
    const existingIndex = next.projects.findIndex((item) => normalize(item.name) === normalize(project.name));
    const existing = existingIndex >= 0 ? next.projects[existingIndex] : null;
    const merged = {
      name: existing?.name || project.name,
      description: existing?.description || project.description,
      techStack: unique([...(existing?.techStack || []), ...project.techStack]),
      problemSolved: existing?.problemSolved || project.problemSolved,
      features: unique([...(existing?.features || []), ...project.features]),
      impact: existing?.impact || project.impact,
      links: unique([...(existing?.links || []), ...project.links]),
    };
    if (existingIndex >= 0) next.projects[existingIndex] = merged;
    else next.projects.push(merged);
  }

  const awards = extractAwards(message).filter((award) => actionClaimHasAffirmativeSupport(award, message));
  next.achievements = unique([...next.achievements, ...awards]);

  if (!next.rawNotes.includes(message)) {
    next.rawNotes = [next.rawNotes, message].filter(Boolean).join("\n\n");
  }
  return next;
}

function contentContainsNumbers(content: CareerPathResumeContent, claim: string) {
  const haystack = normalize(JSON.stringify(content));
  const numbers = numericSignals(claim);
  return numbers.length > 0 && numbers.every((number) => haystack.includes(number));
}

/**
 * Preserve explicit source-backed evidence after generative writing. The writer
 * may rephrase freely, but it must not silently erase source-backed sections or
 * quantified proof. Only already source-gated profile facts are copied here.
 */
export function preserveDeterministicResumeEvidence(input: {
  content: CareerPathResumeContent;
  profile: CareerPathProfile;
  message: string;
}): CareerPathResumeContent {
  const content: CareerPathResumeContent = {
    ...input.content,
    header: {
      ...input.content.header,
      links: { ...input.content.header.links },
    },
    skills: input.content.skills.map((group) => ({ ...group, items: [...group.items] })),
    experience: input.content.experience.map((item) => ({ ...item, bullets: [...item.bullets] })),
    projects: input.content.projects.map((item) => ({ ...item, techStack: [...item.techStack], bullets: [...item.bullets] })),
    education: input.content.education.map((item) => ({ ...item })),
    certifications: input.content.certifications.map((item) => ({ ...item })),
    achievements: [...input.content.achievements],
    languages: [...input.content.languages],
  };

  if (!content.header.name && input.profile.personal.name) content.header.name = input.profile.personal.name;
  if (!content.header.email && input.profile.personal.email) content.header.email = input.profile.personal.email;
  if (!content.header.phone && input.profile.personal.phone) content.header.phone = input.profile.personal.phone;
  if (!content.header.links.github && input.profile.personal.github) content.header.links.github = input.profile.personal.github;
  if (!content.header.links.linkedin && input.profile.personal.linkedin) content.header.links.linkedin = input.profile.personal.linkedin;
  if (!content.header.links.portfolio && input.profile.personal.portfolio) content.header.links.portfolio = input.profile.personal.portfolio;

  const sourceSkills = unique([
    ...input.profile.skills.programming,
    ...input.profile.skills.frameworks,
    ...input.profile.skills.tools,
    ...input.profile.skills.databases,
    ...input.profile.skills.aiTools,
  ]);
  const existingSkills = new Set(content.skills.flatMap((group) => group.items).map(normalize));
  const missingSkills = sourceSkills.filter((skill) => !existingSkills.has(normalize(skill)));
  if (missingSkills.length) {
    const sourceGroup = content.skills.find((group) => normalize(group.category) === "source backed skills");
    if (sourceGroup) sourceGroup.items = unique([...sourceGroup.items, ...missingSkills]);
    else content.skills.push({ category: "Source-backed skills", items: missingSkills });
  }

  for (const source of input.profile.education) {
    const exists = content.education.some((item) =>
      (source.institution && normalize(item.institution) === normalize(source.institution)) ||
      (source.degree && normalize(item.degree).includes(normalize(source.degree))),
    );
    if (!exists) {
      content.education.push({
        institution: source.institution,
        degree: [source.degree, source.field].filter(Boolean).join(" — "),
        dates: [source.startYear, source.endYear].filter(Boolean).join(" – "),
        score: source.score || "",
        location: source.location || "",
      });
    }
  }

  for (const source of input.profile.experience) {
    let target = content.experience.find((item) =>
      (source.company && normalize(item.company) === normalize(source.company)) ||
      (source.role && normalize(item.role) === normalize(source.role)),
    );
    if (!target) {
      target = {
        company: source.company,
        role: source.role,
        dates: [source.startDate, source.endDate].filter(Boolean).join(" – "),
        bullets: [],
      };
      content.experience.push(target);
    }

    const sourceClaims = unique([...source.responsibilities, ...source.achievements]);
    for (const claim of sourceClaims) {
      if (!target.bullets.some((bullet) => normalize(bullet) === normalize(claim))) target.bullets.push(claim);
    }
    target.bullets = unique(target.bullets);
  }

  for (const source of input.profile.projects) {
    let target = content.projects.find((item) => normalize(item.name) === normalize(source.name));
    if (!target) {
      target = { name: source.name, techStack: [...source.techStack], bullets: [] };
      content.projects.push(target);
    } else {
      target.techStack = unique([...target.techStack, ...source.techStack]);
    }

    const projectClaims = unique([source.description, source.problemSolved, ...source.features, source.impact].filter(Boolean));
    for (const claim of projectClaims) {
      if (!target.bullets.some((bullet) => normalize(bullet) === normalize(claim))) target.bullets.push(claim);
    }
    target.bullets = unique(target.bullets);
  }

  content.achievements = unique([...content.achievements, ...input.profile.achievements]);

  const directClaims = extractActionClaims(input.message).filter((claim) => numericSignals(claim).length > 0);
  for (const claim of directClaims) {
    if (contentContainsNumbers(content, claim)) continue;
    const matchingProject = content.projects.find((project) => normalize(input.message).includes(normalize(project.name)));
    if (matchingProject) matchingProject.bullets = unique([...matchingProject.bullets, claim]);
    else if (content.experience.length === 1) content.experience[0].bullets = unique([...content.experience[0].bullets, claim]);
    else content.achievements = unique([...content.achievements, claim]);
  }

  return content;
}
