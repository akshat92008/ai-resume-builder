import { textSupportedByEvidence } from "@/lib/careerpath/profile-evidence";
import { refreshCareerProfileInsights } from "@/lib/careerpath/career-os";
import type {
  AchievementItem,
  CareerDocument,
  CareerProfile,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LinkItem,
  ProjectItem,
  SkillItem,
} from "@/lib/careerpath/types";

function evidenceText(profile: CareerProfile, extraEvidence = "") {
  return [
    ...profile.rawInputs.map((input) => input.content),
    extraEvidence,
  ].filter(Boolean).join("\n\n");
}

function keep(value: string | undefined | null, evidence: string) {
  if (!value) return undefined;
  return textSupportedByEvidence(value, evidence) ? value : undefined;
}

function keepStrings(values: string[] | undefined, evidence: string) {
  return (values || []).filter((value) => textSupportedByEvidence(value, evidence));
}

function keepAchievement(item: AchievementItem, evidence: string): AchievementItem | null {
  if (!textSupportedByEvidence(item.text, evidence)) return null;
  return {
    ...item,
    metric: keep(item.metric, evidence),
    context: keep(item.context, evidence),
    impact: keep(item.impact, evidence),
    evidence: keep(item.evidence, evidence),
  };
}

function keepEducation(item: EducationItem, evidence: string): EducationItem | null {
  const institution = keep(item.institution, evidence);
  const degree = keep(item.degree, evidence);
  if (!institution && !degree) return null;
  return {
    ...item,
    institution: institution || "",
    degree,
    field: keep(item.field, evidence),
    branch: keep(item.branch, evidence),
    startDate: keep(item.startDate, evidence),
    endDate: keep(item.endDate, evidence),
    grade: keep(item.grade, evidence),
    location: keep(item.location, evidence),
    relevantCoursework: keepStrings(item.relevantCoursework, evidence),
    thesis: keep(item.thesis, evidence),
    awards: keepStrings(item.awards, evidence),
    activities: keepStrings(item.activities, evidence),
    notes: keep(item.notes, evidence),
  };
}

function keepExperience(item: ExperienceItem, evidence: string): ExperienceItem | null {
  const company = keep(item.company, evidence);
  const title = keep(item.title, evidence);
  if (!company && !title) return null;
  const achievements = item.achievements.map((achievement) => keepAchievement(achievement, evidence)).filter(Boolean) as AchievementItem[];
  return {
    ...item,
    company: company || "",
    title: title || "",
    location: keep(item.location, evidence),
    startDate: keep(item.startDate, evidence),
    endDate: keep(item.endDate, evidence),
    description: keep(item.description, evidence),
    responsibilities: keepStrings(item.responsibilities, evidence),
    achievements,
    technologies: keepStrings(item.technologies, evidence),
    projects: keepStrings(item.projects, evidence),
    metrics: keepStrings(item.metrics, evidence),
    leadership: keepStrings(item.leadership, evidence),
    businessImpact: keepStrings(item.businessImpact, evidence),
  };
}

function keepLink(item: LinkItem, evidence: string): LinkItem | null {
  return textSupportedByEvidence(item.url, evidence) ? item : null;
}

function keepDocument(item: CareerDocument, evidence: string): CareerDocument | null {
  const name = keep(item.name, evidence);
  const url = keep(item.url, evidence);
  if (!name && !url) return null;
  return { ...item, name: name || "Document", notes: keep(item.notes, evidence), url };
}

function keepProject(item: ProjectItem, evidence: string): ProjectItem | null {
  if (!textSupportedByEvidence(item.name, evidence)) return null;
  const achievements = item.achievements.map((achievement) => keepAchievement(achievement, evidence)).filter(Boolean) as AchievementItem[];
  const links = item.links.map((link) => keepLink(link, evidence)).filter(Boolean) as LinkItem[];
  return {
    ...item,
    description: keep(item.description, evidence),
    problem: keep(item.problem, evidence),
    solution: keep(item.solution, evidence),
    role: keep(item.role, evidence),
    technologies: keepStrings(item.technologies, evidence),
    links,
    github: keep(item.github, evidence),
    liveDemo: keep(item.liveDemo, evidence),
    screenshots: keepStrings(item.screenshots, evidence),
    architecture: keep(item.architecture, evidence),
    challenges: keepStrings(item.challenges, evidence),
    learnings: keepStrings(item.learnings, evidence),
    metrics: keepStrings(item.metrics, evidence),
    tags: keepStrings(item.tags, evidence),
    achievements,
  };
}

function keepSkill(item: SkillItem, evidence: string): SkillItem | null {
  if (!textSupportedByEvidence(item.name, evidence)) return null;
  return { ...item, evidence: keepStrings(item.evidence, evidence) };
}

function keepCertification(item: CertificationItem, evidence: string): CertificationItem | null {
  if (!textSupportedByEvidence(item.name, evidence)) return null;
  return {
    ...item,
    issuer: keep(item.issuer, evidence),
    date: keep(item.date, evidence),
    expiryDate: keep(item.expiryDate, evidence),
    credentialUrl: keep(item.credentialUrl, evidence),
    skills: keepStrings(item.skills, evidence),
  };
}

/**
 * Removes structured Career Memory facts that cannot be traced to raw user
 * inputs (chat/upload/manual edit). Derived strategy fields such as preferences,
 * gaps and strength summaries are not treated as factual resume claims.
 */
export function enforceCareerProfileSourceEvidence(profile: CareerProfile, extraEvidence = ""): CareerProfile {
  const evidence = evidenceText(profile, extraEvidence);
  if (!evidence.trim()) return refreshCareerProfileInsights(profile);

  const education = profile.education.map((item) => keepEducation(item, evidence)).filter(Boolean) as EducationItem[];
  const experience = profile.experience.map((item) => keepExperience(item, evidence)).filter(Boolean) as ExperienceItem[];
  const projects = profile.projects.map((item) => keepProject(item, evidence)).filter(Boolean) as ProjectItem[];
  const skills = profile.skills.map((item) => keepSkill(item, evidence)).filter(Boolean) as SkillItem[];
  const certifications = profile.certifications.map((item) => keepCertification(item, evidence)).filter(Boolean) as CertificationItem[];
  const achievements = profile.achievements.map((item) => keepAchievement(item, evidence)).filter(Boolean) as AchievementItem[];
  const documents = profile.documents.map((item) => keepDocument(item, evidence)).filter(Boolean) as CareerDocument[];
  const links = profile.links.map((item) => keepLink(item, evidence)).filter(Boolean) as LinkItem[];

  const next: CareerProfile = {
    ...profile,
    personal: {
      ...profile.personal,
      fullName: keep(profile.personal.fullName, evidence),
      email: keep(profile.personal.email, evidence),
      phone: keep(profile.personal.phone, evidence),
      website: keep(profile.personal.website, evidence),
      location: keep(profile.personal.location, evidence),
      linkedin: keep(profile.personal.linkedin, evidence),
      github: keep(profile.personal.github, evidence),
      portfolio: keep(profile.personal.portfolio, evidence),
      preferredPronouns: keep(profile.personal.preferredPronouns, evidence),
      timezone: keep(profile.personal.timezone, evidence),
      nationality: keep(profile.personal.nationality, evidence),
      workAuthorization: keep(profile.personal.workAuthorization, evidence),
      visaStatus: keep(profile.personal.visaStatus, evidence),
      languages: keepStrings(profile.personal.languages, evidence),
    },
    target: {
      ...profile.target,
      targetRoles: keepStrings(profile.target.targetRoles, evidence),
      dreamRole: keep(profile.target.dreamRole, evidence),
      dreamCompanies: keepStrings(profile.target.dreamCompanies, evidence),
      targetSalary: keep(profile.target.targetSalary, evidence),
      // Industries are derived taxonomy labels from supported roles.
      targetIndustries: profile.target.targetIndustries,
      targetLocations: keepStrings(profile.target.targetLocations, evidence),
      preferredCountries: keepStrings(profile.target.preferredCountries, evidence),
    },
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
    documents,
    links,
  };

  return refreshCareerProfileInsights(next);
}
