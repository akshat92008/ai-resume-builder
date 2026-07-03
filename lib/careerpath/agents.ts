/**
 * CareerPath AI — Agents Barrel
 *
 * Thin re-export layer. All business logic has been extracted into
 * focused modules: parser.ts, evaluator.ts, generator.ts, text-utils.ts.
 *
 * This file preserves the public API surface so existing callers
 * (`import { X } from "@/lib/careerpath/agents"`) continue to work.
 */

import type {
  BuilderMode,
  BuilderSession,
  CareerPathProfile,
} from "./types";
import { createId } from "./generator";
import { cleanTargetRole, extractTargetRole, inferIndustry } from "./parser";

// Re-export everything from sub-modules so existing imports keep working
export { extractProfileData, extractTargetRole, cleanTargetRole, inferIndustry } from "./parser";
export { detectGaps, auditResume } from "./evaluator";
export { createId, writeResume, improveResume, tailorResume, createResumeRecord, professionalizeBullet } from "./generator";
export * from "./agents/index";

// ---------------------------------------------------------------------------
// Session & Profile Factories (require explicit userId — no hardcoded demo)
// ---------------------------------------------------------------------------

export function emptyCareerPathProfile(userId: string, targetRole = ""): CareerPathProfile {
  const now = new Date().toISOString();
  return {
    id: createId(),
    userId,
    personal: {},
    target: {
      role: targetRole,
      industry: inferIndustry(targetRole),
      experienceLevel: "Student/Fresher",
    },
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
    confidenceNotes: now ? [] : [],
  };
}

export function createBuilderSession(userId: string, mode: BuilderMode, targetRole = ""): BuilderSession {
  const now = new Date().toISOString();
  const session: BuilderSession = {
    id: createId(),
    userId,
    mode,
    targetRole: cleanTargetRole(targetRole),
    currentStep: mode === "improve" ? "collect_profile" : targetRole ? "collect_profile" : "collect_goal",
    profile: emptyCareerPathProfile(userId, targetRole),
    messages: [],
    missingQuestions: [],
    createdAt: now,
    updatedAt: now,
  };
  const firstMessage = getOpeningMessage(mode, targetRole);
  session.messages.push({
    id: createId(),
    role: "assistant",
    content: firstMessage,
    createdAt: now,
  });
  return session;
}

export function getOpeningMessage(mode: BuilderMode, targetRole?: string) {
  if (!targetRole && mode === "build") return "What role are you targeting?";
  if (!targetRole && mode === "tailor") return "What role or job are you targeting?";
  if (mode === "improve") return "Paste your existing resume text. Messy formatting is fine.";
  if (mode === "tailor") return "Paste your current resume text first. After that I will ask for the job description.";
  return "Paste your details. Messy is fine. Include education, skills, projects, certificates, experience, links, or anything you remember.";
}

export function inferIntent(message: string): { intent: BuilderMode; targetRole: string; confidence: number; nextAction: string } {
  const text = message.toLowerCase();
  const intent: BuilderMode = text.includes("tailor") || text.includes("job description")
    ? "tailor"
    : text.includes("improve") || text.includes("existing resume")
      ? "improve"
      : "build";
  return {
    intent,
    targetRole: extractTargetRole(message),
    confidence: text.length > 10 ? 0.86 : 0.62,
    nextAction: intent === "tailor" ? "collect_resume_and_job" : "collect_profile_data",
  };
}
