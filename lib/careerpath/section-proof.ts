import type { CareerPathProfile, CareerPathResumeContent } from "./types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "using", "used",
  "was", "were", "are", "is", "a", "an", "to", "of", "in", "on", "my", "i", "we", "our", "at", "as",
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%-]+/g, " ")
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

function numericSignals(value: string) {
  return [...new Set(normalize(value).match(/\d+(?:\.\d+)?%?/g) || [])];
}

function claimTokens(value: string) {
  return [...new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d/.test(token)),
  )];
}

function isQuantifiedClaim(value: string) {
  return numericSignals(value).length > 0;
}

function claimRepresented(claim: string, values: string[]) {
  const numbers = numericSignals(claim);
  if (!numbers.length) return true;
  const tokens = claimTokens(claim);

  return values.some((value) => {
    const source = normalize(value);
    if (!numbers.every((number) => source.includes(number))) return false;
    if (!tokens.length) return true;
    const matched = tokens.filter((token) => source.includes(token));
    return matched.length / tokens.length >= 0.5;
  });
}

function matchExperience(
  content: CareerPathResumeContent,
  source: CareerPathProfile["experience"][number],
) {
  const company = normalize(source.company);
  const role = normalize(source.role);
  return content.experience.find((item) => company && normalize(item.company) === company)
    || content.experience.find((item) => role && normalize(item.role) === role);
}

function matchProject(
  content: CareerPathResumeContent,
  source: CareerPathProfile["projects"][number],
) {
  const name = normalize(source.name);
  return content.projects.find((item) => name && normalize(item.name) === name);
}

/**
 * Final verification may legitimately remove a generative summary sentence even
 * when that sentence happened to contain a user's metric. A previous global
 * "does the draft contain this number anywhere?" check could therefore conclude
 * that proof was preserved and skip the exact source-backed bullet, only for the
 * summary to disappear later.
 *
 * Re-bind quantified proof to its source section immediately before provenance.
 * The profile passed here has already crossed the raw-source evidence gate, so
 * this helper can only restore user-supported claims; provenance still runs after
 * this function and remains authoritative.
 */
export function preserveSectionBoundQuantifiedEvidence(input: {
  content: CareerPathResumeContent;
  profile: CareerPathProfile;
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

  for (const source of input.profile.experience) {
    const claims = unique([...source.responsibilities, ...source.achievements]).filter(isQuantifiedClaim);
    if (!claims.length) continue;

    let target = matchExperience(content, source);
    if (!target && (source.company || source.role)) {
      target = {
        company: source.company,
        role: source.role,
        dates: [source.startDate, source.endDate].filter(Boolean).join(" – "),
        bullets: [],
      };
      content.experience.push(target);
    }
    if (!target) continue;

    for (const claim of claims) {
      if (!claimRepresented(claim, target.bullets)) target.bullets.push(claim);
    }
    target.bullets = unique(target.bullets);
  }

  const stableClaims = () => [
    ...content.experience.flatMap((item) => item.bullets),
    ...content.projects.flatMap((item) => item.bullets),
    ...content.achievements,
  ];

  for (const source of input.profile.projects) {
    const claims = unique([source.impact, ...source.features].filter(Boolean)).filter(isQuantifiedClaim);
    if (!claims.length) continue;

    let target = matchProject(content, source);
    if (!target && source.name) {
      target = { name: source.name, techStack: [...source.techStack], bullets: [] };
      content.projects.push(target);
    }
    if (!target) continue;

    for (const claim of claims) {
      // Avoid duplicating a quantified fact already bound to an experience entry.
      if (!claimRepresented(claim, stableClaims())) target.bullets.push(claim);
    }
    target.bullets = unique(target.bullets);
  }

  for (const claim of input.profile.achievements.filter(isQuantifiedClaim)) {
    if (!claimRepresented(claim, stableClaims())) content.achievements.push(claim);
  }
  content.achievements = unique(content.achievements);

  return content;
}
