/**
 * CareerPath AI — Profile Parser
 *
 * Extracts structured career data from messy user input text.
 * Handles personal info, education, skills, projects, experience,
 * certifications, achievements, and languages.
 *
 * Extracted from agents.ts to satisfy the Single Responsibility Principle.
 */

import type { CareerPathProfile } from "./types";
import {
  titleCase,
  sentenceCase,
  escapeRegExp,
  unique,
  upsertProfileItem,
  cloneProfile,
} from "./text-utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SKILL_BANK = {
  programming: ["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "Go", "HTML", "CSS", "SQL"],
  frameworks: ["React", "Next.js", "Node.js", "Express", "Tailwind CSS", "Bootstrap", "Django", "Flask", "Supabase", "Firebase"],
  tools: ["Git", "GitHub", "VS Code", "Figma", "Vercel", "Netlify", "Postman", "Docker"],
  databases: ["PostgreSQL", "MySQL", "MongoDB", "SQLite", "Supabase", "Redis"],
  aiTools: ["OpenAI", "ChatGPT", "NVIDIA NIM", "LangChain", "Gemini", "Claude"],
  softSkills: ["Communication", "Problem Solving", "Teamwork", "Leadership", "Adaptability"],
};

export const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["React", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "responsive", "UI"],
  backend: ["Node.js", "Express", "SQL", "PostgreSQL", "API", "authentication", "database"],
  fullstack: ["React", "Next.js", "Node.js", "API", "Supabase", "database", "deployment"],
  ai: ["Python", "OpenAI", "LangChain", "prompt", "automation", "AI"],
  data: ["Python", "SQL", "analytics", "dashboard", "visualization"],
};

export const PROJECT_HINTS = [
  { pattern: /\bai resume builder\b/i, name: "AI Resume Builder" },
  { pattern: /\bresume builder\b/i, name: "Resume Builder" },
  { pattern: /\bai tutor\b/i, name: "AI Tutor" },
  { pattern: /\btutor app\b/i, name: "Tutor App" },
  { pattern: /\bportfolio\b/i, name: "Portfolio Website" },
  { pattern: /\bplumber website\b/i, name: "Service Business Website" },
  { pattern: /\bwebsite(s)?\b/i, name: "Responsive Website" },
  { pattern: /\be[- ]?commerce\b/i, name: "E-commerce Website" },
  { pattern: /\bchatbot\b/i, name: "Chatbot" },
  { pattern: /\bdashboard\b/i, name: "Dashboard" },
];

// ---------------------------------------------------------------------------
// Profile Extraction (main entry point)
// ---------------------------------------------------------------------------

export function extractProfileData(input: string, existing: CareerPathProfile, targetRole = existing.target.role): CareerPathProfile {
  const text = input.trim();
  const profile = cloneProfile(existing);
  profile.target.role = cleanTargetRole(targetRole || profile.target.role || extractTargetRole(text));
  profile.target.industry = inferIndustry(profile.target.role);
  profile.rawNotes = [profile.rawNotes, text].filter(Boolean).join("\n\n");

  extractPersonal(text, profile);
  extractEducation(text, profile);
  extractSkills(text, profile);
  extractProjects(text, profile);
  extractExperience(text, profile);
  extractCertifications(text, profile);
  extractAchievementsAndLanguages(text, profile);

  const hasExistingResumeShape = /(education|experience|projects|skills|summary|certifications)/i.test(text) && text.length > 220;
  if (hasExistingResumeShape) profile.existingResumeText = [profile.existingResumeText, text].filter(Boolean).join("\n\n");

  if (!profile.personal.name && /\bmy name is\b/i.test(text)) {
    const name = text.match(/\bmy name is\s+([a-z][a-z\s.'-]{1,50})/i)?.[1]?.trim();
    if (name) profile.personal.name = titleCase(name);
  }

  return profile;
}

// ---------------------------------------------------------------------------
// Sub-Extractors
// ---------------------------------------------------------------------------

function extractPersonal(text: string, profile: CareerPathProfile) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s-]?){9,14}\d/)?.[0]?.trim();
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const portfolio = urls.find((url) => !/linkedin|github/i.test(url));
  const location = text.match(/\b(?:location|city)\s*[:\-]\s*([a-z\s,.-]{2,50})/i)?.[1]?.trim();
  const explicitName = text.match(/\bname\s*[:\-]\s*([a-z][a-z\s.'-]{1,50})/i)?.[1]?.trim();

  if (email) profile.personal.email = email;
  if (phone) profile.personal.phone = phone;
  if (linkedin) profile.personal.linkedin = linkedin;
  if (github) profile.personal.github = github;
  if (portfolio) profile.personal.portfolio = portfolio;
  if (location) profile.personal.location = titleCase(location);
  if (explicitName && explicitName.length < 60) profile.personal.name = titleCase(explicitName);
}

function extractEducation(text: string, profile: CareerPathProfile) {
  const lower = text.toLowerCase();
  const degree = lower.includes("bca")
    ? "BCA"
    : lower.includes("b.tech") || lower.includes("btech")
      ? "B.Tech"
      : lower.includes("b.sc") || lower.includes("bsc")
      ? "B.Sc"
      : lower.includes("bs ") || lower.includes("b.s") || lower.includes("bachelor of science")
        ? "BS"
        : lower.includes("mca")
          ? "MCA"
          : lower.includes("diploma")
            ? "Diploma"
            : "";
  const institution = text.match(/\b(?:college|school|university|institution)\s*[:\-]?\s*([a-z0-9 &.'-]{3,80})/i)?.[1]?.trim()
    ?? text.match(/\bfrom\s+([a-z0-9 &.'-]{3,80}\s+(?:University|College|School|Institute))\b/i)?.[1]?.trim()
    ?? "";
  const year = text.match(/\b(20[2-4]\d|19[9]\d)\b/)?.[1] ?? "";
  const score = text.match(/\b(?:cgpa|gpa|percentage|score|marks)\s*[:\-]?\s*([0-9.]+%?|[0-9.]+\/10)/i)?.[1] ?? "";
  if (degree || institution) {
    upsertProfileItem(profile.education, {
      institution: titleCase(institution),
      degree,
      field: inferField(text),
      startYear: "",
      endYear: year,
      score,
      location: "",
    }, (item) => `${item.institution}-${item.degree}`);
  }
}

function extractSkills(text: string, profile: CareerPathProfile) {
  for (const [category, skills] of Object.entries(SKILL_BANK)) {
    const key = category as keyof CareerPathProfile["skills"];
    for (const skill of skills) {
      const pattern = new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i");
      if (pattern.test(text)) {
        profile.skills[key] = unique([...profile.skills[key], skill]);
      }
    }
  }
}

function extractProjects(text: string, profile: CareerPathProfile) {
  const links = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  let hintedProjects = 0;
  for (const hint of PROJECT_HINTS) {
    if (hint.name === "Resume Builder" && /\bai resume builder\b/i.test(text)) continue;
    if (!hint.pattern.test(text)) continue;
    hintedProjects += 1;
    const techStack = detectTechStack(text);
    const project = {
      name: hint.name,
      description: sentenceForHint(text, hint.name),
      techStack,
      problemSolved: extractProblemSolved(text),
      features: extractFeatures(text),
      impact: extractImpact(text),
      links,
    };
    upsertProfileItem(profile.projects, project, (item) => item.name.toLowerCase());
  }

  if (hintedProjects > 0) return;

  const projectLines = text.split(/\n+/).filter((line) => /\b(project|built|made|created|developed)\b/i.test(line));
  for (const line of projectLines.slice(0, 4)) {
    const name = line.match(/(?:project|built|made|created|developed)\s*[:\-]?\s*([a-z0-9 &.'-]{3,60})/i)?.[1]?.trim();
    if (!name) continue;
    if (name.length > 46 || /\b(and|then|also|did|made)\b/i.test(name)) continue;
    upsertProfileItem(profile.projects, {
      name: titleCase(name.split(/ using | with | in /i)[0] || name),
      description: line.trim(),
      techStack: detectTechStack(line),
      problemSolved: extractProblemSolved(line),
      features: extractFeatures(line),
      impact: extractImpact(line),
      links,
    }, (item) => item.name.toLowerCase());
  }
}

function extractExperience(text: string, profile: CareerPathProfile) {
  const internship = text.match(/\b(?:intern|internship)\b/i);
  const role = text.match(/\bas\s+(?:a|an)?\s*([a-z0-9 &.'+-]{2,80}?)(?:\.|,|\n|$)/i)?.[1]?.trim() ?? "";
  const company = text.match(/\b(?:worked\s+)?at\s+([a-z0-9 &.'-]{2,80}?)(?:\s+from|\s+as|,|\.|\n|$)/i)?.[1]?.trim()
    ?? text.match(/\bcompany\s*[:\-]?\s*([a-z0-9 &.'-]{2,60})/i)?.[1]?.trim()
    ?? "";
  const dates = text.match(/\bfrom\s+([a-z]{3,9}\s+20\d{2}|20\d{2})\s+to\s+([a-z]{3,9}\s+20\d{2}|20\d{2}|present|current)\b/i);
  if (internship || company) {
    upsertProfileItem(profile.experience, {
      company: titleCase(company),
      role: internship ? "Intern" : titleCase(role),
      startDate: dates?.[1] || "",
      endDate: dates?.[2] || "",
      responsibilities: extractFeatures(text),
      achievements: extractImpact(text) ? [extractImpact(text)] : [],
    }, (item) => `${item.company}-${item.role}`);
  }
}

function extractCertifications(text: string, profile: CareerPathProfile) {
  const lower = text.toLowerCase();
  const certificates = [
    lower.includes("cs50p") ? { name: "CS50P: Introduction to Programming with Python", issuer: "CS50", date: "", credentialLink: "" } : null,
    lower.includes("certificate") || lower.includes("certification")
      ? {
          name: titleCase(text.match(/\b(?:certificate|certification)\s*(?:in|for|:)?\s*([a-z0-9 &.'+-]{3,70})/i)?.[1]?.trim() || "Certification"),
          issuer: "",
          date: text.match(/\b20[2-4]\d\b/)?.[0] || "",
          credentialLink: text.match(/https?:\/\/[^\s)]+/i)?.[0] || "",
        }
      : null,
  ].filter(Boolean) as CareerPathProfile["certifications"];
  for (const certification of certificates) {
    upsertProfileItem(profile.certifications, certification, (item) => item.name.toLowerCase());
  }
}

function extractAchievementsAndLanguages(text: string, profile: CareerPathProfile) {
  const achievementLine = text.match(/\b(?:achievement|award|won|ranked)\b[^\n.]{3,120}/i)?.[0];
  if (achievementLine) profile.achievements = unique([...profile.achievements, sentenceCase(achievementLine)]);

  for (const language of ["English", "Hindi", "Spanish", "French", "German"]) {
    if (new RegExp(`\\b${language}\\b`, "i").test(text)) {
      profile.languages = unique([...profile.languages, language]);
    }
  }
}

// ---------------------------------------------------------------------------
// Text Analysis Helpers (exported for use by evaluator/generator)
// ---------------------------------------------------------------------------

export function extractTargetRole(message: string) {
  const target = message.match(/\b(?:for|as|targeting|role)\s+(?:a|an|the)?\s*([a-z0-9 +#./-]{3,60})(?:\.|,|\n|$)/i)?.[1]?.trim();
  if (target) return cleanTargetRole(target);
  if (/frontend/i.test(message)) return "Frontend Intern";
  if (/backend/i.test(message)) return "Backend Intern";
  if (/full[- ]?stack/i.test(message)) return "Full Stack Intern";
  if (/\bai\b|machine learning|ml\b/i.test(message)) return "AI Intern";
  return "";
}

export function cleanTargetRole(role: string) {
  const cleaned = role.replace(/\b(resume|job|internship|position)\b/gi, "").replace(/\s+/g, " ").trim();
  return cleaned ? titleCase(cleaned) : "";
}

export function inferIndustry(role: string) {
  if (/developer|engineer|frontend|backend|full|software|ai|data|web/i.test(role)) return "Software";
  if (/design|ui|ux/i.test(role)) return "Design";
  if (/marketing|sales/i.test(role)) return "Business";
  return "";
}

export function inferField(text: string) {
  if (/computer|cs|bca|software|it\b/i.test(text)) return "Computer Science";
  if (/commerce|business/i.test(text)) return "Commerce";
  return "";
}

export function detectTechStack(text: string) {
  return unique(Object.values(SKILL_BANK).flat().filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(text)));
}

export function extractFeatures(text: string) {
  const featureWords = ["auth", "login", "dashboard", "chat", "upload", "contact form", "responsive", "seo", "api", "payment", "search"];
  return featureWords.filter((feature) => new RegExp(`\\b${escapeRegExp(feature)}\\b`, "i").test(text)).map(titleCase);
}

export function extractProblemSolved(text: string) {
  return text.match(/\b(?:solved|helps?|for)\s+([^.\n]{8,90})/i)?.[1]?.trim() ?? "";
}

export function extractImpact(text: string) {
  return text.match(/\b(?:impact|result|outcome)\s*[:\-]?\s*([^.\n]{5,100})/i)?.[1]?.trim() ?? "";
}

export function sentenceForHint(text: string, name: string) {
  const sentence = text.split(/[.\n]/).find((item) => item.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  return sentence?.trim() || name;
}

export function targetKeywords(role: string, jobDescription = "") {
  const text = `${role} ${jobDescription}`.toLowerCase();
  const roleSet = Object.entries(ROLE_KEYWORDS).flatMap(([key, words]) => (text.includes(key) ? words : []));
  const knownSkills = Object.values(SKILL_BANK).flat().filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(`${role} ${jobDescription}`));
  const jdTerms = (jobDescription.match(/\b(react|next\.?js|typescript|javascript|python|sql|api|supabase|firebase|node\.?js|tailwind|git|github|responsive|frontend|backend|full[- ]?stack|figma)\b/gi) ?? []).map((v) => {
    const lower = v.toLowerCase().replace(/\s+/g, " ");
    if (/next/.test(lower)) return "Next.js";
    if (/node/.test(lower)) return "Node.js";
    if (/tailwind/.test(lower)) return "Tailwind CSS";
    if (/full/.test(lower)) return "Full Stack";
    return titleCase(v);
  });
  return unique([...roleSet, ...knownSkills, ...jdTerms]).slice(0, 16);
}
