/**
 * CareerOS — Skills Domain
 *
 * Skill extraction, categorization, and evidence mapping.
 * Extracted from career-os.ts for maintainability.
 */

import type { CareerPathProfile, CareerProfile } from "../types";
import { escapeRegExp, unique } from "./utils";

// ---------------------------------------------------------------------------
// Skill Extraction
// ---------------------------------------------------------------------------

export function extractKnownSkills(text: string) {
  const skills = [
    "React", "Next.js", "TypeScript", "JavaScript", "Python", "Node.js", "Express", "Supabase",
    "Firebase", "PostgreSQL", "SQL", "Tailwind CSS", "Figma", "Git", "GitHub", "API", "NVIDIA NIM",
    "OpenAI", "LangChain", "Docker", "HTML", "CSS",
  ];
  return skills.filter((skill) => new RegExp(`\\b${escapeRegExp(skill).replace(/\\ /g, "\\s*")}\\b`, "i").test(text));
}

export function extractRoleKeywords(text: string) {
  return (text.match(/\b(frontend|backend|full[- ]?stack|ai|product|internship|intern|responsive|dashboard|authentication|database|deployment|startup)\b/gi) ?? [])
    .map((item) => item.replace(/full[- ]?stack/i, "Full Stack"))
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase());
}

export function extractNiceToHaveSkills(text: string, requiredSkills: string[]) {
  const niceSections = (text.match(/(?:nice to have|preferred|bonus|plus)[^\n.]{0,220}/gi) ?? []).join(" ");
  return extractKnownSkills(niceSections).filter((skill) => !requiredSkills.includes(skill)).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Skill Categorization
// ---------------------------------------------------------------------------

export function mapSkillCategory(category: string): "technical" | "soft" | "tool" | "language" | "domain" {
  if (category === "softSkills") return "soft";
  if (category === "tools" || category === "aiTools") return "tool";
  if (category === "programming") return "technical";
  return "domain";
}

export function mapSkillSubcategory(category: string): NonNullable<CareerProfile["skills"][number]["subcategory"]> {
  if (category === "programming") return "programming";
  if (category === "frameworks") return "framework";
  if (category === "databases") return "database";
  if (category === "aiTools") return "ai";
  if (category === "softSkills") return "soft";
  return "tool";
}

// ---------------------------------------------------------------------------
// Skill Evidence
// ---------------------------------------------------------------------------

export function evidenceForSkill(skill: string, profile: CareerPathProfile) {
  return profile.projects
    .filter((project) => project.techStack.some((item) => item.toLowerCase() === skill.toLowerCase()))
    .map((project) => project.name);
}

// ---------------------------------------------------------------------------
// Text Extraction Helpers
// ---------------------------------------------------------------------------

export function extractMetrics(text: string) {
  return unique(text.match(/\b(?:\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:users|customers|students|testers|hours|days|weeks|months|seconds|minutes|requests|pages|features|projects|dollars|usd|inr|lpa))\b/gi) ?? [])
    .slice(0, 8);
}

export function extractLeadershipSignals(text: string) {
  return (text.match(/\b(?:led|mentored|managed|coordinated|owned|trained|organized)[^\n.]{2,120}/gi) ?? [])
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .slice(0, 6);
}

export function extractChallenges(text: string) {
  return (text.match(/\b(?:challenge|blocked|difficult|issue|problem)[^\n.]{2,120}/gi) ?? [])
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .slice(0, 4);
}

export function extractLearnings(text: string) {
  return (text.match(/\b(?:learned|learning|improved my understanding|figured out)[^\n.]{2,120}/gi) ?? [])
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .slice(0, 4);
}

export function extractReferencedProjectNames(text: string) {
  return (text.match(/\b(?:project|product|app|website|dashboard)\s+([a-z0-9 &.'-]{3,50})/gi) ?? [])
    .map((item) => {
      const clean = item.replace(/\b(project|product|app|website|dashboard)\b/i, "").trim();
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .slice(0, 6);
}

export function extractDocuments(text: string): CareerProfile["documents"] {
  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return urls
    .filter((url) => /\.(pdf|docx?|pptx?|xlsx?)(?:$|\?)/i.test(url) || /\b(certificate|transcript|portfolio|resume)\b/i.test(url))
    .map((url) => ({
      id: crypto.randomUUID(),
      name: url.split("/").pop()?.replace(/[?#].*$/, "") || "Career Document",
      type: /certificate/i.test(url) ? "certificate" as const : /transcript/i.test(url) ? "transcript" as const : /portfolio/i.test(url) ? "portfolio" as const : /resume/i.test(url) ? "resume" as const : "pdf" as const,
      url,
      createdAt: new Date().toISOString(),
    }));
}

export function extractHiddenExpectations(text: string) {
  const expectations = [
    /\bfast[- ]paced|startup|ambiguous|ownership\b/i.test(text) ? "High ownership in ambiguous environments" : "",
    /\bcross[- ]functional|stakeholder|collaborate\b/i.test(text) ? "Cross-functional communication" : "",
    /\bscale|performance|latency|reliability\b/i.test(text) ? "Performance and reliability mindset" : "",
    /\bmentor|lead|review\b/i.test(text) ? "Leadership beyond individual contribution" : "",
    /\bcustomer|user|client\b/i.test(text) ? "User or customer empathy" : "",
  ];
  return expectations.filter(Boolean);
}

export function extractDreamCompanies(text: string) {
  const match = text.match(/\b(?:dream company|target companies|preferred companies)\s*[:\-]\s*([^\n.]{2,160})/i)?.[1];
  return match ? text.split(/,|;|\||\band\b/i).map((item) => item.trim()).filter(Boolean).slice(0, 8) : [];
}

export function extractPreferredCountries(text: string) {
  const match = text.match(/\b(?:preferred countries|target countries|countries)\s*[:\-]\s*([^\n.]{2,160})/i)?.[1];
  return match ? text.split(/,|;|\||\band\b/i).map((item) => item.trim()).filter(Boolean).slice(0, 8) : [];
}

export function extractCoursework(text: string) {
  const match = text.match(/\b(?:coursework|courses)\s*[:\-]\s*([^\n.]{2,180})/i)?.[1];
  return match ? text.split(/,|;|\||\band\b/i).map((item) => item.trim()).filter(Boolean).slice(0, 10) : [];
}

export function extractAwards(text: string) {
  return (text.match(/\b(?:award|won|winner|ranked|honou?r|scholarship)[^\n.]{2,120}/gi) ?? [])
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .slice(0, 6);
}

export function extractActivities(text: string) {
  const match = text.match(/\b(?:activities|clubs|societies)\s*[:\-]\s*([^\n.]{2,180})/i)?.[1];
  return match ? text.split(/,|;|\||\band\b/i).map((item) => item.trim()).filter(Boolean).slice(0, 8) : [];
}

export function inferIndustry(text: string) {
  const lower = text.toLowerCase();
  if (/\b(ai|llm|machine learning|ml|data)\b/.test(lower)) return "AI / Software";
  if (/\bfrontend|backend|full[- ]?stack|software|developer|engineer\b/.test(lower)) return "Software";
  if (/\bfinance|bank|fintech|trading\b/.test(lower)) return "Finance";
  if (/\bhealth|medical|clinic|hospital\b/.test(lower)) return "Healthcare";
  if (/\bedtech|education|school|learning\b/.test(lower)) return "Education";
  if (/\becommerce|retail|marketplace\b/.test(lower)) return "Commerce";
  return "";
}
