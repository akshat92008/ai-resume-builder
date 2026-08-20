import type {
  CareerPathResumeContent,
  CareerProfile,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
} from "@/lib/careerpath/types";

export type ClaimProvenanceEntry = {
  section: "header" | "summary" | "skill" | "experience" | "project" | "education" | "certification" | "achievement" | "language";
  item: string;
  claim: string;
  sourceId?: string;
  supported: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
};

export type ClaimProvenanceReport = {
  entries: ClaimProvenanceEntry[];
  removedClaims: number;
  supportedClaims: number;
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "that", "this", "using", "used", "built", "created", "developed", "implemented", "designed", "delivered", "worked", "role", "team", "project", "application", "system", "user", "users", "through", "across", "while", "which", "their", "your", "our", "was", "were", "are", "is", "to", "of", "in", "on", "a", "an",
]);

const MATERIAL_OUTCOME_STEMS = [
  "accelerat", "boost", "cut", "decreas", "deliver", "drove", "driv", "enhanc",
  "grew", "grow", "improv", "increas", "lead", "led", "optimiz", "own", "rais",
  "reduc", "sav", "scale", "streamlin", "transform", "automat",
];

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.%-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claimTokens(value: string) {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d/.test(token)))];
}

function numericSignals(value: string) {
  // Do not use a trailing word boundary here: `%` is not a word character, so
  // `/\b...%?\b/` silently turned `900%` into `900`. Keeping the unit matters
  // because `9`, `9%`, and `900%` are materially different factual claims.
  return [...new Set(normalize(value).match(/\d+(?:\.\d+)?%?/g) || [])];
}

function materialOutcomeSignals(value: string) {
  const tokens = normalize(value).split(" ");
  return [...new Set(MATERIAL_OUTCOME_STEMS.filter((stem) => tokens.some((token) => token.startsWith(stem))))];
}

function sourceHasStem(sourceText: string, stem: string) {
  return sourceText.split(" ").some((token) => token.startsWith(stem));
}

function sourceTextForProject(item: ProjectItem) {
  return normalize([
    item.name,
    item.description,
    item.problem,
    item.solution,
    item.role,
    ...item.technologies,
    ...(item.metrics || []),
    ...item.achievements.flatMap((achievement) => [achievement.text, achievement.metric, achievement.context, achievement.impact, achievement.evidence]),
    ...(item.challenges || []),
    ...(item.learnings || []),
  ].filter(Boolean).join(" "));
}

function sourceTextForExperience(item: ExperienceItem) {
  return normalize([
    item.company,
    item.title,
    item.location,
    item.startDate,
    item.endDate,
    item.description,
    ...item.responsibilities,
    ...item.technologies,
    ...(item.metrics || []),
    ...(item.leadership || []),
    ...(item.businessImpact || []),
    ...item.achievements.flatMap((achievement) => [achievement.text, achievement.metric, achievement.context, achievement.impact, achievement.evidence]),
  ].filter(Boolean).join(" "));
}

function sourceTextForEducation(item: EducationItem) {
  return normalize([
    item.institution,
    item.degree,
    item.field,
    item.branch,
    item.startDate,
    item.endDate,
    item.grade,
    item.location,
    ...(item.relevantCoursework || []),
    ...(item.awards || []),
    ...(item.activities || []),
  ].filter(Boolean).join(" "));
}

function sourceTextForCertification(item: CertificationItem) {
  return normalize([
    item.name,
    item.issuer,
    item.date,
    item.expiryDate,
    item.credentialUrl,
    ...(item.skills || []),
  ].filter(Boolean).join(" "));
}

function sourceTextForProfile(profile: CareerProfile) {
  return normalize([
    profile.personal?.fullName,
    profile.personal?.email,
    profile.personal?.phone,
    profile.personal?.location,
    profile.personal?.linkedin,
    profile.personal?.github,
    profile.personal?.portfolio,
    ...(profile.personal?.languages || []),
    ...(profile.target?.targetRoles || []),
    ...profile.education.map(sourceTextForEducation),
    ...profile.experience.map(sourceTextForExperience),
    ...profile.projects.map(sourceTextForProject),
    ...profile.skills.flatMap((item) => [item.name, item.category, ...(item.evidence || [])]),
    ...profile.certifications.map(sourceTextForCertification),
    ...profile.achievements.flatMap((item) => [item.text, item.metric, item.context, item.impact, item.evidence]),
    ...profile.links.flatMap((item) => [item.label, item.url]),
  ].filter(Boolean).join(" "));
}

function assessClaim(claim: string, sourceText: string, minimumOverlap = 0.45) {
  const reasons: string[] = [];
  const numbers = numericSignals(claim);
  const unsupportedNumbers = numbers.filter((number) => !sourceText.includes(number));
  if (unsupportedNumbers.length) reasons.push(`Unsupported numeric signal${unsupportedNumbers.length === 1 ? "" : "s"}: ${unsupportedNumbers.join(", ")}`);

  const outcomeSignals = materialOutcomeSignals(claim);
  const unsupportedOutcomes = outcomeSignals.filter((stem) => !sourceHasStem(sourceText, stem));
  if (unsupportedOutcomes.length) {
    reasons.push(`Unsupported outcome/ownership signal${unsupportedOutcomes.length === 1 ? "" : "s"}: ${unsupportedOutcomes.join(", ")}`);
  }

  const tokens = claimTokens(claim);
  const matched = tokens.filter((token) => sourceText.includes(token));
  const overlap = tokens.length ? matched.length / tokens.length : 1;
  if (tokens.length >= 3 && overlap < minimumOverlap) reasons.push(`Low evidence-token overlap (${Math.round(overlap * 100)}%).`);

  const supported = unsupportedNumbers.length === 0
    && unsupportedOutcomes.length === 0
    && (tokens.length < 3 || overlap >= minimumOverlap);
  const confidence: "high" | "medium" | "low" = !supported ? "low" : overlap >= 0.7 ? "high" : "medium";
  return { supported, confidence, reasons };
}

function exactClaimAssessment(claim: string, sourceText: string, reason: string) {
  const normalized = normalize(claim);
  const supported = Boolean(normalized) && sourceText.includes(normalized);
  return {
    supported,
    confidence: supported ? "high" as const : "low" as const,
    reasons: supported ? [] : [reason],
  };
}

function matchProject(profile: CareerProfile, name: string) {
  const target = normalize(name);
  return profile.projects.find((item) => normalize(item.name) === target)
    || profile.projects.find((item) => target && normalize(item.name) && (target.includes(normalize(item.name)) || normalize(item.name).includes(target)));
}

function matchExperience(profile: CareerProfile, company: string, role: string) {
  const companyTarget = normalize(company);
  const roleTarget = normalize(role);
  return profile.experience.find((item) => normalize(item.company) === companyTarget && (!roleTarget || normalize(item.title) === roleTarget))
    || profile.experience.find((item) => companyTarget && normalize(item.company) === companyTarget)
    || profile.experience.find((item) => roleTarget && normalize(item.title) === roleTarget);
}

function matchEducation(profile: CareerProfile, institution: string, degree: string) {
  const institutionTarget = normalize(institution);
  const degreeTarget = normalize(degree);
  return profile.education.find((item) => institutionTarget && normalize(item.institution) === institutionTarget)
    || profile.education.find((item) => degreeTarget && sourceTextForEducation(item).includes(degreeTarget));
}

function matchCertification(profile: CareerProfile, name: string) {
  const target = normalize(name);
  return profile.certifications.find((item) => target && normalize(item.name) === target)
    || profile.certifications.find((item) => target && sourceTextForCertification(item).includes(target));
}

function sentenceClaims(summary: string) {
  return summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function enforceResumeClaimProvenance(content: CareerPathResumeContent, profile: CareerProfile) {
  const entries: ClaimProvenanceEntry[] = [];
  const profileSource = sourceTextForProfile(profile);

  const headerSource = normalize([
    profile.personal?.fullName,
    profile.personal?.email,
    profile.personal?.phone,
    profile.personal?.location,
    profile.personal?.linkedin,
    profile.personal?.github,
    profile.personal?.portfolio,
    ...profile.links.map((item) => item.url),
  ].filter(Boolean).join(" "));
  const checkHeader = (field: string, value: string | null | undefined) => {
    if (!value) return value || "";
    const assessment = exactClaimAssessment(value, headerSource, `${field} is not represented in Career Memory evidence.`);
    entries.push({ section: "header", item: field, claim: value, ...assessment });
    return assessment.supported ? value : "";
  };
  const header = {
    ...content.header,
    name: checkHeader("name", content.header.name),
    email: checkHeader("email", content.header.email),
    phone: checkHeader("phone", content.header.phone),
    location: checkHeader("location", content.header.location),
    links: {
      linkedin: checkHeader("linkedin", content.header.links.linkedin),
      github: checkHeader("github", content.header.links.github),
      portfolio: checkHeader("portfolio", content.header.links.portfolio),
    },
  };

  const summarySentences = sentenceClaims(content.summary);
  const supportedSummary = summarySentences.filter((claim) => {
    const assessment = assessClaim(claim, profileSource, 0.35);
    entries.push({ section: "summary", item: "Professional summary", claim, ...assessment });
    return assessment.supported;
  });
  const summary = supportedSummary.join(" ");

  const skills = content.skills
    .map((group) => ({
      ...group,
      items: group.items.filter((skill) => {
        const normalizedSkill = normalize(skill);
        const supported = Boolean(normalizedSkill) && profileSource.includes(normalizedSkill);
        entries.push({
          section: "skill",
          item: group.category,
          claim: skill,
          supported,
          confidence: supported ? "high" : "low",
          reasons: supported ? [] : ["Skill is not represented in Career Memory evidence."],
        });
        return supported;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const experience = content.experience.flatMap((item) => {
    const source = matchExperience(profile, item.company, item.role);
    if (!source) {
      entries.push({
        section: "experience",
        item: `${item.role} @ ${item.company}`,
        claim: `${item.role} @ ${item.company}`,
        supported: false,
        confidence: "low",
        reasons: ["No matching Career Memory experience source."],
      });
      return [];
    }
    const sourceText = sourceTextForExperience(source);
    const identityClaim = [item.role, item.company, item.dates, item.location].filter(Boolean).join(" | ");
    const identity = assessClaim(identityClaim, sourceText, 0.35);
    entries.push({ section: "experience", item: `${item.role} @ ${item.company}`, claim: identityClaim, sourceId: source.id, ...identity });
    if (!identity.supported) return [];
    const bullets = item.bullets.filter((claim) => {
      const assessment = assessClaim(claim, sourceText);
      entries.push({ section: "experience", item: `${item.role} @ ${item.company}`, claim, sourceId: source.id, ...assessment });
      return assessment.supported;
    });
    return [{ ...item, bullets }];
  });

  const projects = content.projects.flatMap((item) => {
    const source = matchProject(profile, item.name);
    if (!source) {
      entries.push({ section: "project", item: item.name, claim: item.name, supported: false, confidence: "low", reasons: ["No matching Career Memory project source."] });
      return [];
    }
    const sourceText = sourceTextForProject(source);
    const identityClaim = [item.name, ...(item.techStack || []), item.link].filter(Boolean).join(" | ");
    const identity = assessClaim(identityClaim, sourceText, 0.35);
    entries.push({ section: "project", item: item.name, claim: identityClaim, sourceId: source.id, ...identity });
    if (!identity.supported) return [];
    const bullets = item.bullets.filter((claim) => {
      const assessment = assessClaim(claim, sourceText);
      entries.push({ section: "project", item: item.name, claim, sourceId: source.id, ...assessment });
      return assessment.supported;
    });
    return [{ ...item, bullets }];
  });

  const education = content.education.flatMap((item) => {
    const source = matchEducation(profile, item.institution, item.degree);
    if (!source) {
      entries.push({ section: "education", item: item.institution || item.degree, claim: [item.institution, item.degree].filter(Boolean).join(" | "), supported: false, confidence: "low", reasons: ["No matching Career Memory education source."] });
      return [];
    }
    const claim = [item.institution, item.degree, item.dates, item.score, item.location].filter(Boolean).join(" | ");
    const assessment = assessClaim(claim, sourceTextForEducation(source), 0.3);
    entries.push({ section: "education", item: item.institution || item.degree, claim, sourceId: source.id, ...assessment });
    return assessment.supported ? [item] : [];
  });

  const certifications = content.certifications.flatMap((item) => {
    const source = matchCertification(profile, item.name);
    if (!source) {
      entries.push({ section: "certification", item: item.name, claim: item.name, supported: false, confidence: "low", reasons: ["No matching Career Memory certification source."] });
      return [];
    }
    const claim = [item.name, item.issuer, item.date, item.link].filter(Boolean).join(" | ");
    const assessment = assessClaim(claim, sourceTextForCertification(source), 0.3);
    entries.push({ section: "certification", item: item.name, claim, sourceId: source.id, ...assessment });
    return assessment.supported ? [item] : [];
  });

  const achievementSource = normalize(profile.achievements.flatMap((item) => [item.text, item.metric, item.context, item.impact, item.evidence]).filter(Boolean).join(" "));
  const achievements = content.achievements.filter((claim) => {
    const assessment = achievementSource
      ? assessClaim(claim, achievementSource)
      : { supported: false, confidence: "low" as const, reasons: ["No matching Career Memory achievement source."] };
    entries.push({ section: "achievement", item: "Achievement", claim, ...assessment });
    return assessment.supported;
  });

  const languageSource = normalize(profile.personal?.languages?.join(" ") || "");
  const languages = content.languages.filter((claim) => {
    const assessment = exactClaimAssessment(claim, languageSource, "Language is not represented in Career Memory evidence.");
    entries.push({ section: "language", item: "Language", claim, ...assessment });
    return assessment.supported;
  });

  const report: ClaimProvenanceReport = {
    entries,
    removedClaims: entries.filter((entry) => !entry.supported).length,
    supportedClaims: entries.filter((entry) => entry.supported).length,
  };

  return {
    content: { ...content, header, summary, skills, experience, projects, education, certifications, achievements, languages },
    report,
  };
}
