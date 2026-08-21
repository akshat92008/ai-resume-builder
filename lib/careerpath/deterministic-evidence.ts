import { extractKnownSkills, inferIndustry } from "./domain/skills";
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
  return cleanFragment(
    message.match(/\b(?:my name is|i am called|i'm called)\s+([a-z][a-z0-9 .'-]{1,80}?)(?=\s+(?:and\s+)?i\b|[,.!?]|$)/i)?.[1] || "",
  );
}

function extractTargetRole(message: string) {
  return cleanFragment(
    message.match(/\b(?:targeting|seeking|looking for)\s+(?:an?\s+)?([a-z][a-z0-9+/# .&'-]{1,80}?)(?:\s+roles?\b|[.;!?]|$)/i)?.[1] || "",
  );
}

function extractExperience(message: string) {
  const withDates = message.match(
    /\bworked\s+at\s+([^,.!?]{2,100}?)\s+as\s+(?:an?\s+)?([^,.!?]{2,100}?)\s+from\s+([^,.!?]{2,30}?)\s+to\s+([^,.!?]{2,30}?)(?=[,.!?]|$)/i,
  );
  if (withDates) {
    return {
      company: cleanFragment(withDates[1]),
      role: cleanFragment(withDates[2]),
      startDate: cleanFragment(withDates[3]),
      endDate: cleanFragment(withDates[4]),
    };
  }

  const withoutDates = message.match(
    /\bworked\s+at\s+([^,.!?]{2,100}?)\s+as\s+(?:an?\s+)?([^,.!?]{2,100}?)(?=[,.!?]|$)/i,
  );
  if (!withoutDates) return null;
  return {
    company: cleanFragment(withoutDates[1]),
    role: cleanFragment(withoutDates[2]),
    startDate: "",
    endDate: "",
  };
}

function extractProject(message: string) {
  const match = message.match(
    /\bbuilt\s+(?:an?\s+)?([^,.!?]{2,100}?)\s+using\s+([^!?]{2,240}?)(?=(?:,\s*(?:and\s+)?(?:implemented|wrote|created|developed|designed|added|launched|tested)\b)|[!?]|\.(?:\s|$)|$)/i,
  );
  if (!match) return null;
  const name = cleanFragment(match[1]);
  const source = cleanFragment(match[2]);
  const techStack = extractKnownSkills(source);
  return {
    name,
    description: sentenceCase(`built ${name}${techStack.length ? ` using ${techStack.join(", ")}` : ""}`),
    techStack,
  };
}

function extractActionClaims(message: string) {
  const claims: string[] = [];
  const pattern = /\b(?:i\s+)?(implemented|wrote|created|developed|designed|led|managed|improved|increased|reduced|decreased|optimized|automated|delivered|launched|tested)\s+([^,.!?;\n]{2,180})/gi;
  for (const match of message.matchAll(pattern)) {
    const claim = sentenceCase(`${match[1]} ${match[2]}`);
    if (claim) claims.push(claim);
  }
  return unique(claims);
}

function categorizeSkills(skills: string[]) {
  const frameworks = new Set(["react", "next.js", "express", "tailwind css", "langchain"]);
  const programming = new Set(["typescript", "javascript", "python", "node.js", "html", "css"]);
  const databases = new Set(["postgresql", "sql", "supabase", "firebase"]);
  const aiTools = new Set(["nvidia nim", "openai"]);

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

/**
 * Recover high-confidence facts directly from the authenticated user's message.
 * This is intentionally conservative: it recognizes a small set of explicit
 * first-person career statements and never infers facts that were not present
 * in the source text. It is used both to supplement successful LLM extraction
 * and to keep new-user Career Memory usable when the provider times out.
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

  const sourceTargetRole = extractTargetRole(message) || cleanFragment(input.targetRole || "");
  if (!next.target.role && sourceTargetRole) next.target.role = sourceTargetRole;
  if (!next.target.industry && (sourceTargetRole || message)) next.target.industry = inferIndustry(sourceTargetRole || message);

  const detectedSkills = categorizeSkills(extractKnownSkills(message));
  next.skills.programming = unique([...next.skills.programming, ...detectedSkills.programming]);
  next.skills.frameworks = unique([...next.skills.frameworks, ...detectedSkills.frameworks]);
  next.skills.tools = unique([...next.skills.tools, ...detectedSkills.tools]);
  next.skills.databases = unique([...next.skills.databases, ...detectedSkills.databases]);
  next.skills.aiTools = unique([...next.skills.aiTools, ...detectedSkills.aiTools]);

  const actionClaims = extractActionClaims(message);
  const quantifiedClaims = actionClaims.filter((claim) => numericSignals(claim).length > 0);
  const experience = extractExperience(message);
  if (experience?.company || experience?.role) {
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
      responsibilities: unique([...(existing?.responsibilities || []), ...actionClaims]),
      achievements: unique([...(existing?.achievements || []), ...quantifiedClaims]),
    };
    if (existingIndex >= 0) next.experience[existingIndex] = merged;
    else next.experience.push(merged);
  }

  const project = extractProject(message);
  if (project?.name) {
    const existingIndex = next.projects.findIndex((item) => normalize(item.name) === normalize(project.name));
    const existing = existingIndex >= 0 ? next.projects[existingIndex] : null;
    const merged = {
      name: existing?.name || project.name,
      description: existing?.description || project.description,
      techStack: unique([...(existing?.techStack || []), ...project.techStack]),
      problemSolved: existing?.problemSolved || "",
      features: unique([...(existing?.features || []), ...actionClaims.filter((claim) => !quantifiedClaims.includes(claim))]),
      impact: existing?.impact || quantifiedClaims[0] || "",
      links: [...(existing?.links || [])],
    };
    if (existingIndex >= 0) next.projects[existingIndex] = merged;
    else next.projects.push(merged);
  }

  if (!next.experience.length && !next.projects.length && quantifiedClaims.length) {
    next.achievements = unique([...next.achievements, ...quantifiedClaims]);
  }

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
 * may rephrase freely, but it must not silently erase a user's quantified proof
 * or collapse an evidence section to empty. Only already source-gated profile
 * facts are copied into the candidate, so this cannot introduce unsupported
 * claims before the canonical truth/provenance verifier runs.
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
    for (const claim of sourceClaims.filter((value) => numericSignals(value).length > 0)) {
      if (!contentContainsNumbers(content, claim)) target.bullets.push(claim);
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

    const projectClaims = unique([source.impact, ...source.features].filter(Boolean));
    for (const claim of projectClaims.filter((value) => numericSignals(value).length > 0)) {
      if (!contentContainsNumbers(content, claim)) target.bullets.push(claim);
    }
    target.bullets = unique(target.bullets);
  }

  const directClaims = extractActionClaims(input.message).filter((claim) => numericSignals(claim).length > 0);
  for (const claim of directClaims) {
    if (contentContainsNumbers(content, claim)) continue;
    if (content.experience[0]) content.experience[0].bullets = unique([...content.experience[0].bullets, claim]);
    else if (content.projects[0]) content.projects[0].bullets = unique([...content.projects[0].bullets, claim]);
    else content.achievements = unique([...content.achievements, claim]);
  }

  return content;
}
