/**
 * CareerOS — Jobs Domain
 *
 * Job description extraction, intelligence analysis, application packs,
 * job application creation, and career command routing.
 * Extracted from career-os.ts for maintainability.
 */

import type {
  ApplicationPack,
  CareerCommandResult,
  CareerContext,
  CareerPathProfile,
  CareerPathResume,
  CareerProfile,
  JobApplication,
  JobDescription,
  JobIntelligenceReport,
  KeywordRanking,
} from "../types";
import { addDaysIso, clamp, command, createId, titleCase, unique } from "./utils";
import {
  extractHiddenExpectations,
  extractKnownSkills,
  extractNiceToHaveSkills,
  extractRoleKeywords,
  inferIndustry,
} from "./skills";
import { isAchievementLogInput } from "./achievements";

// ---------------------------------------------------------------------------
// Job Description Extraction
// ---------------------------------------------------------------------------

export function extractJobDescription(rawText: string): JobDescription {
  const now = new Date().toISOString();
  const title = rawText.match(/\b(?:title|role|position)\s*[:\-]\s*([^\n]{3,80})/i)?.[1]?.trim();
  const company = rawText.match(/\bcompany\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim();
  const location = rawText.match(/\blocation\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim();
  const skills = extractKnownSkills(rawText);
  const salaryClues = rawText.match(/(?:\$|rs\.?|inr|usd|lpa|salary|compensation)[^\n.]{0,80}/gi) ?? [];
  const niceToHaveSkills = extractNiceToHaveSkills(rawText, skills);
  const responsibilities = rawText
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => /\b(build|develop|design|work|collaborate|implement|maintain|create|support|own)\b/i.test(line))
    .slice(0, 8);
  const seniority = /\bsenior|lead|principal\b/i.test(rawText)
    ? "senior"
    : /\bintern|internship\b/i.test(rawText)
      ? "intern"
      : /\bjunior|entry[- ]level|fresher\b/i.test(rawText)
        ? "junior"
        : undefined;

  return {
    id: createId(),
    title,
    company,
    location,
    rawText,
    extractedSkills: skills,
    responsibilities,
    hiddenExpectations: extractHiddenExpectations(rawText),
    requiredExperience: rawText.match(/\b\d\+?\s+years?[^\n.]{0,60}/i)?.[0],
    seniority,
    salaryClues: unique(salaryClues.map((item) => item.trim())).slice(0, 4),
    requiredTools: skills.filter((skill) => /\b(tool|tools|stack|must|required|experience with|proficient)\b/i.test(rawText.slice(Math.max(0, rawText.toLowerCase().indexOf(skill.toLowerCase()) - 80), rawText.toLowerCase().indexOf(skill.toLowerCase()) + 120))).slice(0, 10),
    niceToHaveSkills,
    industry: inferIndustry(rawText),
    keywords: unique([...skills, ...niceToHaveSkills, ...extractRoleKeywords(rawText)]).slice(0, 18),
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Job Intelligence
// ---------------------------------------------------------------------------

export function analyzeJobIntelligence(job: JobDescription, profile: CareerProfile): JobIntelligenceReport {
  const memorySkillNames = profile.skills.map((skill) => skill.name.toLowerCase());
  const matchedSkills = job.keywords.filter((keyword) => memorySkillNames.includes(keyword.toLowerCase()));
  const missingSkills = job.keywords.filter((keyword) => !memorySkillNames.includes(keyword.toLowerCase())).slice(0, 8);
  const hasExperience = profile.experience.length > 0;
  const missingExperience = [
    job.requiredExperience && !hasExperience ? job.requiredExperience : "",
    job.seniority === "senior" && !["senior", "mid"].includes(profile.target.experienceLevel || "") ? "senior-level ownership evidence" : "",
    job.responsibilities.some((item) => /\blead|mentor|own\b/i.test(item)) && !profile.experience.some((item) => item.leadership?.length) ? "leadership or ownership examples" : "",
  ].filter(Boolean);
  const keywordRanking: KeywordRanking[] = job.keywords.map((keyword, index) => ({
    keyword,
    importance: index < 4 ? "critical" : index < 8 ? "high" : index < 13 ? "medium" : "low",
    presentInCareerMemory: memorySkillNames.includes(keyword.toLowerCase()),
  }));
  const fitPercentage = clamp(Math.round(
    35 +
    (matchedSkills.length / Math.max(1, job.keywords.length)) * 45 +
    (profile.projects.length ? 8 : 0) +
    (hasExperience ? 7 : 0) -
    missingExperience.length * 5,
  ), 0, 100);

  return {
    job,
    fitPercentage,
    matchedSkills,
    missingSkills,
    missingExperience,
    keywordRanking,
    hiddenExpectations: job.hiddenExpectations,
    salaryClues: job.salaryClues,
    requiredTools: job.requiredTools,
    niceToHaveSkills: job.niceToHaveSkills,
    industry: job.industry,
  };
}

// ---------------------------------------------------------------------------
// Application Pack
// ---------------------------------------------------------------------------

export function generateApplicationPack(
  profile: CareerProfile,
  resume: CareerPathResume,
  job: JobDescription,
): ApplicationPack {
  const now = new Date().toISOString();
  const name = profile.personal.fullName || "the candidate";
  const role = job.title || resume.targetRole || profile.target.targetRoles[0] || "this role";
  const company = job.company || "your team";
  const assets = profile.strengths.map((item) => item.title).slice(0, 3);
  const missingSkills = job.keywords.filter((keyword) => !profile.skills.some((skill) => skill.name.toLowerCase() === keyword.toLowerCase())).slice(0, 6);

  return {
    id: createId(),
    jobId: job.id,
    resumeId: resume.id,
    coverLetter: `Dear ${company} team,\n\nI am excited to apply for ${role}. My strongest fit comes from ${assets.join(", ") || "hands-on project work and a proof-based resume"}. I have focused on truthful, role-relevant work using ${profile.skills.map((skill) => skill.name).slice(0, 6).join(", ") || "practical tools"} and would welcome the chance to bring that execution mindset to ${company}.\n\nBest,\n${name}`,
    recruiterDM: `Hi, I found the ${role} opening at ${company}. My background includes ${assets[0] || "hands-on project work"} and I would love to be considered. Happy to share my resume.`,
    coldEmail: `Subject: Application for ${role}\n\nHi ${company} team,\n\nI am applying for ${role}. My resume highlights ${assets.join(", ") || "project-based proof"} and role-relevant skills without unsupported claims. I would be grateful for the opportunity to discuss how I can contribute.\n\nBest,\n${name}`,
    linkedinMessage: `Hi, I saw the ${role} role at ${company}. I am interested and have relevant proof from ${assets[0] || "recent project work"}. Could I share my resume?`,
    whyFitAnswer: `I am a fit for ${role} because my resume is built around ${assets.join(", ") || "practical, proof-backed work"} and the skills I can truthfully support: ${profile.skills.map((skill) => skill.name).slice(0, 8).join(", ") || "project execution and learning speed"}.`,
    interviewQuestions: [],
    missingSkills,
    preparationPlan: [
      "Review every resume claim and remove anything you cannot support.",
      missingSkills.length ? `Decide whether to learn or explicitly leave out ${missingSkills.slice(0, 2).join(" and ")}.` : "Send the tailored resume with the cover letter.",
      "Add GitHub/demo links before sending if available.",
    ],
    followUpMessage: `Hi, I wanted to follow up on my application for ${role}. I remain very interested in ${company} and would be happy to share any additional details about my projects or resume.`,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// Job Application
// ---------------------------------------------------------------------------

export function createJobApplicationFromCommand(
  input: string,
  userId: string | null,
  resume?: CareerPathResume | null,
  job?: JobDescription | null,
): JobApplication {
  const now = new Date().toISOString();
  const company = job?.company || input.match(/\b(?:company|at)\s*[:\-]?\s*([a-z0-9 &.'-]{2,70})/i)?.[1]?.trim() || "Saved Company";
  const role = job?.title || input.match(/\b(?:role|position|for)\s*[:\-]?\s*([a-z0-9 +#./-]{3,80})/i)?.[1]?.trim() || resume?.targetRole || "Target Role";
  const jobUrl = input.match(/https?:\/\/[^\s)]+/i)?.[0];
  const applied = /\b(applied|submitted|sent)\b/i.test(input);
  return {
    id: createId(),
    userId,
    company: titleCase(company),
    role: titleCase(role),
    jobUrl,
    jobDescriptionId: job?.id,
    resumeId: resume?.id,
    status: applied ? "applied" : "saved",
    appliedAt: applied ? now : undefined,
    followUpAt: applied ? addDaysIso(5) : undefined,
    notes: input,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Career Command Routing
// ---------------------------------------------------------------------------

export function routeCareerCommand(input: string, context: CareerContext = {}): CareerCommandResult {
  const text = input.toLowerCase();
  const wantsPack = /\b(application pack|prepare everything|cover letter|recruiter|cold email|linkedin message)\b/.test(text);
  const wantsTrack = /\b(track|applied|application status|follow up|follow-up|saved this job)\b/.test(text);
  const wantsAnalyze = /\b(not getting interviews|why.*interviews|analy[sz]e.*job search|last \d+ applications|0 replies|no replies)\b/.test(text);
  const wantsTailor = /\b(tailor|job description|match this jd|jd:|requirements|qualifications)\b/.test(text);
  const wantsVersion = /\b(master|fresher|internship|frontend|full stack|ai product|startup|corporate).*\b(resume|version)\b/.test(text);
  const wantsImprove = /\b(improve|stronger|better|ats|polish|rewrite)\b/.test(text);
  const wantsLinkedIn = /\blinkedin\b/.test(text) && /\b(optimi[sz]e|profile|headline|about|featured|seo)\b/.test(text);
  const wantsAchievementLog = isAchievementLogInput(input);
  const wantsMemory = /\b(add this|add to|career memory|my github|my linkedin|my resume|link|url)\b/.test(text) || /https?:\/\/[^\s]+/.test(text);
  const careerData = /\b(i am|i built|i made|i know|project|certificate|education|college|intern|fresher|student|optimized|improved|shipped|launched|reduced|increased|won|published)\b/.test(text) || input.length > 140 || wantsMemory;

  if (wantsPack) return command("generate_application_pack", false, true, true, false, false, "I will tailor the resume and prepare the full application pack.");
  if (wantsTrack) return command("track_job_application", false, false, false, true, false, "I will save this as a tracked application.");
  if (wantsAnalyze) return command("analyze_job_search", false, false, false, false, true, "I will analyze your application outcomes and suggest a strategy adjustment.");
  if (wantsTailor) return command("tailor_resume_to_job", false, true, false, false, false, "I will tailor your resume to this job without adding unsupported keywords.");
  if (wantsVersion) return command("generate_resume_version", true, false, false, false, false, "I will generate a smarter resume version for this use case.");
  if (wantsImprove) return command("improve_resume", false, false, false, false, false, "I will improve the current resume using proof-based edits.");
  if (wantsLinkedIn) return command("optimize_linkedin", false, false, false, false, false, "I will generate LinkedIn sections from Career Memory.");
  if (wantsAchievementLog) return command("log_achievement", true, false, false, false, false, "I will save this achievement to career memory and turn it into a stronger bullet.", true);
  if (careerData || !context.resume) return command("build_career_profile", true, false, false, false, false, "I will update your career memory and build a resume from it.");
  return command("general_career_question", false, false, false, false, false, "Ask me to build, tailor, pack, track, or analyze your job search.");
}
