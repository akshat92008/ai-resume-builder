/**
 * CareerOS — Profile Domain
 *
 * Career profile creation, merging, gap detection, strengths, and weaknesses.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  AchievementItem,
  CareerGap,
  CareerPathProfile,
  CareerProfile,
  ProofLevel,
} from "../types";
import {
  achievementItem,
  cleanEmpty,
  createId,
  gap,
  link,
  sentenceCase,
  unique,
  uniqueBy,
} from "./utils";
import {
  evidenceForSkill,
  extractActivities,
  extractAwards,
  extractChallenges,
  extractCoursework,
  extractDocuments,
  extractDreamCompanies,
  extractKnownSkills,
  extractLearnings,
  extractLeadershipSignals,
  extractMetrics,
  extractPreferredCountries,
  extractReferencedProjectNames,
  mapSkillCategory,
  mapSkillSubcategory,
} from "./skills";

// ---------------------------------------------------------------------------
// Profile Conversion
// ---------------------------------------------------------------------------

export function legacyProfileToCareerProfile(
  profile: CareerPathProfile | undefined,
  userId?: string | null,
  rawInput?: string,
): CareerProfile {
  const now = new Date().toISOString();
  const source: CareerPathProfile = profile ?? {
    id: createId(),
    userId: userId || "careerpath-demo-user",
    personal: {},
    target: { role: "", industry: "", experienceLevel: "fresher" },
    education: [],
    skills: { programming: [], frameworks: [], tools: [], databases: [], aiTools: [], softSkills: [] },
    projects: [],
    experience: [],
    certifications: [],
    achievements: [],
    languages: [],
    rawNotes: rawInput || "",
    confidenceNotes: [],
  };

  const personal = source.personal || {} as any;
  const target = source.target || {} as any;
  const education = source.education || [];
  const experience = source.experience || [];
  const projects = source.projects || [];
  const certifications = source.certifications || [];
  const achievements = source.achievements || [];
  const languages = source.languages || [];
  const skills = source.skills || { programming: [], frameworks: [], tools: [], databases: [], aiTools: [], softSkills: [] };

  const links = [
    personal.linkedin ? link("LinkedIn", personal.linkedin, "linkedin") : null,
    personal.github ? link("GitHub", personal.github, "github") : null,
    personal.portfolio ? link("Portfolio", personal.portfolio, "portfolio") : null,
  ].filter(Boolean) as CareerProfile["links"];

  const careerProfile: CareerProfile = {
    id: source.id,
    userId: userId || source.userId || null,
    personal: {
      fullName: personal.name,
      email: personal.email,
      phone: personal.phone,
      website: personal.portfolio,
      location: personal.location,
      linkedin: personal.linkedin,
      github: personal.github,
      portfolio: personal.portfolio,
      languages,
    },
    target: {
      targetRoles: unique([target.role].filter(Boolean)),
      dreamRole: target.role,
      dreamCompanies: extractDreamCompanies(source.rawNotes || rawInput || ""),
      targetIndustries: unique([target.industry].filter(Boolean)),
      targetLocations: [],
      preferredCountries: extractPreferredCountries(source.rawNotes || rawInput || ""),
      workPreference: "any",
      remote: /\bremote\b/i.test(source.rawNotes || rawInput || ""),
      hybrid: /\bhybrid\b/i.test(source.rawNotes || rawInput || ""),
      relocation: /\brelocat(e|ion)\b/i.test(source.rawNotes || rawInput || ""),
      experienceLevel: normalizeExperienceLevel(target.experienceLevel),
    },
    preferences: {
      resumeLength: "one_page",
      writingTone: "professional",
      targetSeniority: target.experienceLevel,
      templatePreference: "ats",
      atsPreference: "balanced",
    },
    education: education.map((item: any) => ({
      id: createId(),
      institution: item.institution || "Education",
      degree: item.degree,
      field: item.field,
      branch: item.branch || item.field,
      startDate: item.startYear,
      endDate: item.endYear,
      grade: item.score,
      location: item.location,
      relevantCoursework: extractCoursework(source.rawNotes || rawInput || ""),
      awards: extractAwards(source.rawNotes || rawInput || ""),
      activities: extractActivities(source.rawNotes || rawInput || ""),
    })),
    experience: experience.map((item: any) => ({
      id: createId(),
      company: item.company || "Experience",
      title: item.role || target.role || "Contributor",
      startDate: item.startDate,
      endDate: item.endDate,
      responsibilities: item.responsibilities,
      achievements: item.achievements.map((achievement: any) => achievementItem(achievement, "strong")),
      technologies: extractKnownSkills(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      projects: extractReferencedProjectNames(item.responsibilities?.join(" ") || ""),
      metrics: extractMetrics(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      leadership: extractLeadershipSignals(`${item.responsibilities?.join(" ") || ""} ${item.achievements?.join(" ") || ""}`),
      businessImpact: item.achievements || [],
      documents: [],
      proofLevel: item.achievements.length ? "strong" : "weak",
    })),
    projects: projects.map((item: any) => ({
      id: createId(),
      name: item.name,
      description: item.description,
      problem: item.problemSolved,
      solution: item.description,
      technologies: item.techStack,
      links: (item.links || []).map((url: string) => link(url.includes("github") ? "GitHub" : "Project Link", url, url.includes("github") ? "github" : "demo")),
      github: (item.links || []).find((url: string) => /github/i.test(url)),
      liveDemo: (item.links || []).find((url: string) => !/github/i.test(url)),
      challenges: extractChallenges(item.description || item.problemSolved || ""),
      learnings: extractLearnings(source.rawNotes || rawInput || ""),
      metrics: extractMetrics(`${item.impact || ""} ${item.description || ""}`),
      tags: unique([...(item.techStack || []), target.role, target.industry].filter(Boolean)).slice(0, 8),
      achievements: buildProjectAchievements(item),
      status: inferProjectStatus(item.links, item.impact),
      proofLevel: proofFromProject(item.links, item.impact, item.techStack),
    })),
    skills: Object.entries(skills).flatMap(([category, skills]) =>
      skills.map((skillName) => ({
        id: createId(),
        name: skillName,
        category: mapSkillCategory(category),
        subcategory: mapSkillSubcategory(category),
        evidence: evidenceForSkill(skillName, source),
      })),
    ),
    certifications: certifications.map((item: any) => ({
      id: createId(),
      name: item.name,
      issuer: item.issuer,
      date: item.date,
      expiryDate: item.expiryDate,
      credentialUrl: item.credentialLink,
    })),
    achievements: achievements.map((item: any) => achievementItem(item, "strong")),
    documents: extractDocuments(source.rawNotes || rawInput || ""),
    links,
    rawInputs: source.rawNotes || rawInput
      ? [{ id: createId(), content: [source.rawNotes, rawInput].filter(Boolean).join("\n\n"), source: "chat", createdAt: now }]
      : [],
    gaps: [],
    strengths: [],
    weaknesses: [],
    createdAt: now,
    updatedAt: now,
  };

  careerProfile.gaps = detectCareerGaps(careerProfile);
  careerProfile.strengths = detectCareerStrengths(careerProfile);
  careerProfile.weaknesses = detectCareerWeaknesses(careerProfile);
  return careerProfile;
}

// ---------------------------------------------------------------------------
// Career Memory Merge
// ---------------------------------------------------------------------------

export function mergeCareerMemory(
  existing: CareerProfile | undefined | null,
  extracted: CareerProfile,
): CareerProfile {
  if (!existing) return extracted;
  const merged: CareerProfile = {
    ...existing,
    personal: { ...existing.personal, ...cleanEmpty(extracted.personal) },
    target: {
      ...existing.target,
      targetRoles: unique([...existing.target.targetRoles, ...extracted.target.targetRoles]),
      dreamRole: extracted.target.dreamRole || existing.target.dreamRole,
      dreamCompanies: unique([...(existing.target.dreamCompanies || []), ...(extracted.target.dreamCompanies || [])]),
      targetIndustries: unique([...existing.target.targetIndustries, ...extracted.target.targetIndustries]),
      targetLocations: unique([...existing.target.targetLocations, ...extracted.target.targetLocations]),
      preferredCountries: unique([...(existing.target.preferredCountries || []), ...(extracted.target.preferredCountries || [])]),
      targetSalary: extracted.target.targetSalary || existing.target.targetSalary,
      remote: existing.target.remote || extracted.target.remote,
      hybrid: existing.target.hybrid || extracted.target.hybrid,
      relocation: existing.target.relocation || extracted.target.relocation,
      workPreference: extracted.target.workPreference || existing.target.workPreference,
      experienceLevel: extracted.target.experienceLevel || existing.target.experienceLevel,
    },
    preferences: {
      ...existing.preferences,
      ...cleanEmpty(extracted.preferences || {}),
    },
    education: uniqueBy([...existing.education, ...extracted.education], (item) => `${item.institution}-${item.degree}`.toLowerCase()),
    experience: uniqueBy([...existing.experience, ...extracted.experience], (item) => `${item.company}-${item.title}`.toLowerCase()),
    projects: uniqueBy([...existing.projects, ...extracted.projects], (item) => item.name.toLowerCase()),
    skills: uniqueBy([...existing.skills, ...extracted.skills], (item) => item.name.toLowerCase()),
    certifications: uniqueBy([...existing.certifications, ...extracted.certifications], (item) => item.name.toLowerCase()),
    achievements: uniqueBy([...existing.achievements, ...extracted.achievements], (item) => item.text.toLowerCase()),
    documents: uniqueBy([...(existing.documents || []), ...(extracted.documents || [])], (item) => `${item.type}-${item.name}-${item.url || ""}`.toLowerCase()),
    links: uniqueBy([...existing.links, ...extracted.links], (item) => item.url.toLowerCase()),
    rawInputs: uniqueBy([...existing.rawInputs, ...extracted.rawInputs], (item) => item.content),
    gaps: [],
    strengths: [],
    weaknesses: [],
    updatedAt: new Date().toISOString(),
  };
  return refreshCareerProfileInsights(merged);
}

// ---------------------------------------------------------------------------
// Profile Insights
// ---------------------------------------------------------------------------

export function refreshCareerProfileInsights(profile: CareerProfile): CareerProfile {
  const next: CareerProfile = {
    ...profile,
    preferences: profile.preferences || {
      resumeLength: "one_page",
      writingTone: "professional",
      templatePreference: "ats",
      atsPreference: "balanced",
    },
    documents: profile.documents || [],
    personal: {
      ...profile.personal,
      languages: profile.personal.languages || [],
    },
    target: {
      ...profile.target,
      dreamCompanies: profile.target.dreamCompanies || [],
      preferredCountries: profile.target.preferredCountries || [],
    },
  };
  next.gaps = detectCareerGaps(next);
  next.strengths = detectCareerStrengths(next);
  next.weaknesses = detectCareerWeaknesses(next);
  return next;
}

export function detectCareerGaps(profile: CareerProfile): CareerGap[] {
  const gaps: CareerGap[] = [];
  if (!profile.personal.email && !profile.personal.phone) gaps.push(gap("contact", "What email or phone number should recruiters use?", "high"));
  if (!profile.links.some((item) => item.type === "github" || item.type === "portfolio")) gaps.push(gap("proof_links", "Do you have GitHub, portfolio, certificate, or deployed project links?", "high"));
  if (!profile.documents.length && !profile.links.some((item) => item.type === "certificate")) gaps.push(gap("documents", "Do you want to attach certificates, transcripts, portfolio PDFs, or reference letters?", "low"));
  if (!profile.education.length && ["student", "fresher", "intern"].includes(profile.target.experienceLevel || "")) gaps.push(gap("education", "What is your education institution, degree/course, and graduation year?", "high"));
  for (const project of profile.projects.slice(0, 3)) {
    if (!project.links.length) gaps.push(gap("project_links", `Do you have a GitHub or live demo link for ${project.name}?`, "high"));
    if (!project.achievements.some((item) => item.metric || item.impact)) gaps.push(gap("project_impact", `What problem did ${project.name} solve, and do you have any result or user feedback?`, "medium"));
  }
  if (!profile.target.targetRoles.length) gaps.push(gap("target_role", "What roles are you targeting first?", "high"));
  return uniqueBy(gaps, (item) => item.question).slice(0, 6);
}

export function detectCareerStrengths(profile: CareerProfile) {
  const strengths = [];
  if (profile.projects.length) {
    strengths.push({
      id: createId(),
      title: `${profile.projects.length} project${profile.projects.length > 1 ? "s" : ""} ready for positioning`,
      explanation: "Projects are strong proof for students, freshers, self-taught builders, and career switchers.",
      relatedItems: profile.projects.map((item) => item.id),
    });
  }
  const technicalSkills = profile.skills.filter((item) => item.category === "technical" || item.category === "tool");
  if (technicalSkills.length) {
    strengths.push({
      id: createId(),
      title: `${technicalSkills.slice(0, 4).map((item) => item.name).join(", ")} skill cluster`,
      explanation: "These skills can anchor role-specific resume versions when backed by projects.",
      relatedItems: technicalSkills.map((item) => item.id),
    });
  }
  if (profile.achievements.length) {
    strengths.push({
      id: createId(),
      title: `${profile.achievements.length} reusable achievement${profile.achievements.length > 1 ? "s" : ""}`,
      explanation: "Achievements can be reused across resumes, LinkedIn, cover letters, and application answers.",
      relatedItems: profile.achievements.map((item) => item.id),
    });
  }
  return strengths;
}

export function detectCareerWeaknesses(profile: CareerProfile) {
  const weaknesses = [];
  if (profile.gaps.some((item) => item.area.includes("proof"))) {
    weaknesses.push({
      id: createId(),
      title: "Proof links are thin",
      explanation: "Recruiters may hesitate if projects have no GitHub, demo, certificate, or outcome evidence.",
      suggestedFix: "Add links or one confirmed implementation detail for each top project.",
    });
  }
  if (!profile.projects.some((item) => item.achievements.some((achievement) => achievement.metric || achievement.impact))) {
    weaknesses.push({
      id: createId(),
      title: "Impact is not quantified yet",
      explanation: "The resume can stay truthful, but it needs context such as users, testers, pages, time saved, or workflow improved.",
      suggestedFix: "Answer the achievement questions for your strongest project.",
    });
  }
  return weaknesses;
}

// ---------------------------------------------------------------------------
// Profile Helpers (Private)
// ---------------------------------------------------------------------------

function normalizeExperienceLevel(value: string | undefined): CareerProfile["target"]["experienceLevel"] {
  const text = (value || "").toLowerCase();
  if (text.includes("switch")) return "career_switcher";
  if (text.includes("student")) return "student";
  if (text.includes("intern")) return "intern";
  if (text.includes("junior")) return "junior";
  if (text.includes("mid")) return "mid";
  if (text.includes("senior")) return "senior";
  return "fresher";
}

function buildProjectAchievements(project: CareerPathProfile["projects"][number]): AchievementItem[] {
  const achievements: AchievementItem[] = [];
  if (project.problemSolved) achievements.push(achievementItem(`Designed ${project.name} around ${project.problemSolved}.`, "strong", project.name));
  if (project.features.length) achievements.push(achievementItem(`Implemented ${project.features.slice(0, 3).join(", ")} in ${project.name}.`, "strong", project.name));
  if (project.impact) achievements.push(achievementItem(project.impact, "strong", project.name));
  if (!achievements.length && project.description) achievements.push(achievementItem(project.description, project.techStack.length ? "estimated" : "weak", project.name));
  return achievements;
}

function proofFromProject(links: string[], impact: string, techStack: string[]): ProofLevel {
  if (links.some((item) => /github|demo|vercel|netlify|app\./i.test(item)) && impact) return "verified";
  if (links.length || impact) return "strong";
  if (techStack.length >= 2) return "estimated";
  return "weak";
}

function inferProjectStatus(links: string[], impact: string): CareerProfile["projects"][number]["status"] {
  if (/revenue|paid|sales/i.test(impact)) return "revenue";
  if (/\busers?|testers?|customers?\b/i.test(impact)) return "users";
  if (links.some((item) => /vercel|netlify|render|app\.|demo/i.test(item))) return "deployed";
  return "built";
}
