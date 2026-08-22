import type { CareerPathResumeContent } from "./types";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizedSkill(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

const CANONICAL_SKILL_CATEGORIES = new Map<string, string>([
  ["typescript", "Programming"],
  ["javascript", "Programming"],
  ["python", "Programming"],
  ["html", "Programming"],
  ["css", "Programming"],
  ["react", "Frameworks & Runtime"],
  ["next.js", "Frameworks & Runtime"],
  ["node.js", "Frameworks & Runtime"],
  ["express", "Frameworks & Runtime"],
  ["tailwind css", "Frameworks & Runtime"],
  ["langchain", "Frameworks & Runtime"],
  ["postgresql", "Databases"],
  ["mongodb", "Databases"],
  ["redis", "Databases"],
  ["sql", "Databases"],
  ["supabase", "Databases"],
  ["firebase", "Databases"],
  ["aws", "Cloud & DevOps"],
  ["docker", "Cloud & DevOps"],
  ["kubernetes", "Cloud & DevOps"],
  ["git", "Developer Tools"],
  ["github", "Developer Tools"],
  ["figma", "Developer Tools"],
  ["openai", "AI & ML"],
  ["nvidia nim", "AI & ML"],
  ["machine learning", "AI & ML"],
]);

function pushUnique(target: string[], value: string) {
  if (!target.some((item) => normalizedSkill(item) === normalizedSkill(value))) target.push(value);
}

export function createEmptyResumeContent(name = ""): CareerPathResumeContent {
  return {
    header: { name, email: "", phone: "", location: "", links: {} },
    summary: "",
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    languages: [],
  };
}

/**
 * Database JSON predates some of the current required resume arrays. Normalize
 * every hydrated record at the persistence boundary so legacy or draft rows can
 * never crash workspace rendering with `undefined.map` / `undefined.length`.
 */
export function normalizeResumeContent(value: unknown): CareerPathResumeContent {
  const raw = objectValue(value);
  const header = objectValue(raw.header);
  const links = objectValue(header.links);

  const skills = Array.isArray(raw.skills)
    ? raw.skills.map(objectValue).map((item) => ({
        category: stringValue(item.category),
        items: stringArray(item.items),
      })).filter((item) => item.category || item.items.length)
    : [];

  const experience = Array.isArray(raw.experience)
    ? raw.experience.map(objectValue).map((item) => ({
        company: stringValue(item.company),
        role: stringValue(item.role),
        dates: stringValue(item.dates),
        location: stringValue(item.location),
        bullets: stringArray(item.bullets),
      })).filter((item) => item.company || item.role || item.bullets.length)
    : [];

  const projects = Array.isArray(raw.projects)
    ? raw.projects.map(objectValue).map((item) => ({
        name: stringValue(item.name),
        techStack: stringArray(item.techStack),
        link: stringValue(item.link),
        bullets: stringArray(item.bullets),
      })).filter((item) => item.name || item.techStack.length || item.bullets.length)
    : [];

  const education = Array.isArray(raw.education)
    ? raw.education.map(objectValue).map((item) => ({
        institution: stringValue(item.institution),
        degree: stringValue(item.degree),
        dates: stringValue(item.dates),
        score: stringValue(item.score),
        location: stringValue(item.location),
      })).filter((item) => item.institution || item.degree)
    : [];

  const certifications = Array.isArray(raw.certifications)
    ? raw.certifications.map(objectValue).map((item) => ({
        name: stringValue(item.name),
        issuer: stringValue(item.issuer),
        date: stringValue(item.date),
        link: stringValue(item.link),
      })).filter((item) => item.name)
    : [];

  return {
    header: {
      name: stringValue(header.name),
      email: stringValue(header.email),
      phone: stringValue(header.phone),
      location: stringValue(header.location),
      links: {
        linkedin: stringValue(links.linkedin),
        github: stringValue(links.github),
        portfolio: stringValue(links.portfolio),
      },
    },
    summary: stringValue(raw.summary),
    skills,
    experience,
    projects,
    education,
    certifications,
    achievements: stringArray(raw.achievements),
    languages: stringArray(raw.languages),
  };
}

/**
 * Models may choose misleading headings (for example "Frontend" for Express).
 * Move only a bounded list of well-known technologies into deterministic
 * categories after truth/provenance validation. Unknown or domain-specific
 * skills remain in the user's/model's original group, so this is classification
 * normalization rather than factual generation.
 */
export function normalizeKnownResumeSkillCategories(content: CareerPathResumeContent): CareerPathResumeContent {
  const canonical = new Map<string, string[]>();
  const unknownGroups: Array<{ category: string; items: string[] }> = [];
  const seen = new Set<string>();

  for (const group of content.skills) {
    const unknownItems: string[] = [];
    for (const skill of group.items) {
      const key = normalizedSkill(skill);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const category = CANONICAL_SKILL_CATEGORIES.get(key);
      if (category) {
        const items = canonical.get(category) || [];
        pushUnique(items, skill);
        canonical.set(category, items);
      } else {
        pushUnique(unknownItems, skill);
      }
    }
    if (unknownItems.length) unknownGroups.push({ category: group.category || "Skills", items: unknownItems });
  }

  const preferredOrder = ["Programming", "Frameworks & Runtime", "Databases", "Cloud & DevOps", "Developer Tools", "AI & ML"];
  const canonicalGroups = preferredOrder
    .filter((category) => (canonical.get(category) || []).length > 0)
    .map((category) => ({ category, items: canonical.get(category)! }));

  return {
    ...content,
    skills: [...canonicalGroups, ...unknownGroups],
  };
}
