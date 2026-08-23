import type { CareerPathProfile } from "./types";
import { reconcileExtractedProfileWithEvidence } from "./profile-evidence";
import { stripUnsourcedProfileLocations } from "./location-evidence";
import { recoverStructuredProfileEvidence } from "./structured-profile-recovery";

function emptyEvidenceProfile(profile: CareerPathProfile): CareerPathProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    personal: {},
    target: { role: "", industry: "", experienceLevel: "" },
    education: [],
    skills: {
      programming: [],
      frameworks: [],
      tools: [],
      databases: [],
      aiTools: [],
      softSkills: [],
    },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: "",
    confidenceNotes: [],
  };
}

const STRUCTURED_HEADING = /^(?:personal profile|career goals?|education|experience|projects?|skills|certifications?|documents?|achievements?|languages?)\s*:?\s*$/i;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
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

/**
 * A user-authored `Skills:` section is an explicit inventory, not prose to be
 * semantically expanded. Preserve its exact skill labels so model-derived
 * abstractions such as `API` cannot replace a supplied framework like FastAPI.
 */
function explicitStructuredSkills(evidence: string) {
  const lines = evidence.split(/\r?\n/);
  const start = lines.findIndex((line) => /^skills\s*:?\s*$/i.test(line.trim()));
  if (start < 0) return null;

  const items: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed && STRUCTURED_HEADING.test(trimmed)) break;
    if (!trimmed) continue;
    for (const raw of trimmed.split(/,|;|\|/)) {
      const skill = raw.replace(/^[-•]\s*/, "").replace(/[.:]+$/g, "").trim();
      if (!skill || skill.length > 60) continue;
      if (/^i\s+(?:do\s+not|don't|never|have\s+never)\b/i.test(skill)) break;
      items.push(skill);
    }
  }
  return unique(items);
}

function applyExplicitStructuredSkills(profile: CareerPathProfile, evidence: string): CareerPathProfile {
  const explicit = explicitStructuredSkills(evidence);
  if (!explicit) return profile;

  const programmingNames = new Set(["python", "javascript", "typescript", "java", "go", "c", "c++", "c#", "node.js", "html", "css"]);
  const frameworkNames = new Set(["react", "next.js", "express", "fastapi", "tailwind css", "langchain"]);
  const databaseNames = new Set(["postgresql", "mongodb", "redis", "sql", "supabase", "firebase"]);
  const aiNames = new Set(["openai", "nvidia nim", "machine learning"]);

  const categorized = explicit.reduce((acc, skill) => {
    const key = normalize(skill);
    if (programmingNames.has(key)) acc.programming.push(skill);
    else if (frameworkNames.has(key)) acc.frameworks.push(skill);
    else if (databaseNames.has(key)) acc.databases.push(skill);
    else if (aiNames.has(key)) acc.aiTools.push(skill);
    else acc.tools.push(skill);
    return acc;
  }, {
    programming: [] as string[],
    frameworks: [] as string[],
    tools: [] as string[],
    databases: [] as string[],
    aiTools: [] as string[],
  });

  return {
    ...profile,
    skills: {
      ...profile.skills,
      programming: categorized.programming,
      frameworks: categorized.frameworks,
      tools: categorized.tools,
      databases: categorized.databases,
      aiTools: categorized.aiTools,
    },
  };
}

/**
 * CareerPathProfile.rawNotes is append-only user-authored source material. Run
 * the structured profile back through the evidence gate before it is converted
 * into Career Memory, so an extractor-only invention cannot become provenance.
 */
export function enforceCareerPathProfileEvidence(profile: CareerPathProfile): CareerPathProfile {
  const evidence = [profile.rawNotes, profile.existingResumeText].filter(Boolean).join("\n\n");
  if (!evidence.trim()) return profile;

  const gated = reconcileExtractedProfileWithEvidence({
    message: evidence,
    existing: emptyEvidenceProfile(profile),
    extracted: profile,
  });
  const structuredRecovered = recoverStructuredProfileEvidence(gated);
  const skillGated = applyExplicitStructuredSkills(structuredRecovered, evidence);
  const locationGated = stripUnsourcedProfileLocations(skillGated, evidence);

  return {
    ...locationGated,
    id: profile.id,
    userId: profile.userId,
    rawNotes: profile.rawNotes,
    existingResumeText: profile.existingResumeText,
  };
}
