/**
 * Resume-focused intent handlers for the Inngest orchestrator.
 * Handles: CREATE_RESUME, IMPROVE_RESUME, TAILOR_TO_JOB, ADD_INFORMATION,
 * REWRITE_SECTION, GENERATE_RESUME_VERSION.
 */

import {
  extractProfileDataAgent,
  detectGapsAgent,
  writeResumeAgent,
  auditResumeAgent,
  improveResumeAgent,
  tailorResumeAgent,
} from "@/lib/careerpath/orchestrator";
import { createResumeRecord } from "@/lib/careerpath/agents";
import {
  applyAchievementLog,
  buildCareerWorkspaceState,
  generateSmartResumeVersions,
  isAchievementLogInput,
  legacyProfileToCareerProfile,
  mergeCareerMemory,
  refreshCareerProfileInsights,
} from "@/lib/careerpath/career-os";
import { saveServerResume, saveResumeVersion } from "@/lib/careerpath/db";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { decorateResumeForCareerOS, emptyCareerPathProfile } from "./shared";
import type {
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeContent,
  GapReport,
} from "@/lib/careerpath/types";

export async function handleCreateResume(
  message: string,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  return applyBrainToResume({ message, currentResume: null, userId, mode: "build", metadata });
}

export async function handleImproveResume(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) return applyBrainToResume({ message, currentResume: null, userId, mode: "improve", metadata });
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before improvement v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-improvement snapshot",
  });
  return applyBrainToResume({ message, currentResume, userId, mode: "improve", metadata, versionCreated: true });
}

export async function handleTailorToJob(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) return applyBrainToResume({ message, currentResume: null, userId, mode: "tailor", metadata });
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before tailoring v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-tailoring snapshot",
  });
  return applyBrainToResume({ message, currentResume, userId, mode: "tailor", metadata, versionCreated: true });
}

export async function handleAddInformation(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  return applyBrainToResume({ message, currentResume, userId, mode: "build", metadata });
}

export async function handleRewriteSection(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "I don't have a resume to edit. Build one first by sharing your career details.",
      resume: null,
      resumeId: null,
    };
  }
  return applyBrainToResume({ message, currentResume, userId, mode: "improve", metadata });
}

export async function handleGenerateResumeVersion(message: string, currentResume: CareerPathResume | null) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then I can generate master, fresher, internship, frontend, full stack, AI product, startup, corporate, and job-specific versions.",
      resume: null,
      resumeId: null,
      missingFields: ["resume"],
      workspace: buildCareerWorkspaceState(null),
    };
  }

  decorateResumeForCareerOS(currentResume, message);
  const versions = generateSmartResumeVersions(currentResume, currentResume.careerProfile!);
  const requested = versions.find((version) => message.toLowerCase().includes(version.versionType.replace("_", " "))) || versions[0];
  return {
    assistantMessage: `${requested.title} is ready as a smart version strategy.\n\nUse it when: ${requested.whenToUse}\n\nEmphasizes: ${requested.emphasizes.join(", ")}.\nReduces: ${requested.reduces.join(", ")}.\nMissing: ${(requested.missing.length ? requested.missing : ["nothing critical"]).join(", ")}.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume, message),
  };
}

export async function applyBrainToResume(input: {
  message: string;
  currentResume: CareerPathResume | null;
  userId: string;
  mode: "build" | "improve" | "tailor";
  metadata?: { userId: string; resumeId?: string };
  versionCreated?: boolean;
}) {
  let legacyProfile: CareerPathProfile = input.currentResume?.profile || emptyCareerPathProfile(input.userId);
  const existingCareerProfile = input.currentResume?.careerProfile
    ? refreshCareerProfileInsights(input.currentResume.careerProfile)
    : null;
  let profile = existingCareerProfile || legacyProfileToCareerProfile(legacyProfile, input.userId, input.message);
  let achievementLogResult: ReturnType<typeof applyAchievementLog>["result"] | null = null;
  let assistantMessage = "";

  if (input.mode === "build") {
    legacyProfile = await extractProfileDataAgent(
      input.message,
      legacyProfile,
      input.currentResume?.targetRole || "",
      input.metadata,
    );
    let gaps: GapReport = {
      readyToGenerate: true,
      questionsToAsk: [],
      criticalMissing: [],
      recommendedMissing: [],
      resumeRisk: [],
    };
    if (input.message.length < 50) gaps = await detectGapsAgent(legacyProfile, input.mode, input.metadata);
    if (!gaps.readyToGenerate && gaps.questionsToAsk.length > 0) {
      return {
        assistantMessage: `I need a few details first:\n\n${gaps.questionsToAsk.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`,
        resume: input.currentResume,
        resumeId: input.currentResume?.id || null,
        missingFields: gaps.criticalMissing,
        workspace: buildCareerWorkspaceState(input.currentResume),
      };
    }

    const extractedCareerProfile = legacyProfileToCareerProfile(legacyProfile, input.userId, input.message);
    profile = mergeCareerMemory(existingCareerProfile, extractedCareerProfile);
    if (isAchievementLogInput(input.message)) {
      const logged = applyAchievementLog(profile, input.message);
      profile = logged.profile;
      achievementLogResult = logged.result;
    }
    assistantMessage = input.currentResume
      ? "Updated Career Memory and refreshed the resume from the latest information."
      : "Created a first resume draft and saved the details to Career Memory.";
  }

  let candidateContent: CareerPathResumeContent;
  let tailoringResult = null;
  let missingKeywords: string[] = [];
  let matchedKeywords: string[] = [];

  if (input.mode === "tailor" && input.currentResume) {
    const jobDesc = input.message;
    tailoringResult = await tailorResumeAgent(
      input.currentResume.content,
      input.currentResume.targetRole || "",
      jobDesc,
      input.metadata,
    );
    candidateContent = tailoringResult.tailoredResume;
    missingKeywords = tailoringResult.missingKeywordsNotAdded;
    matchedKeywords = tailoringResult.matchedKeywords;
    assistantMessage = `Tailored the resume toward the job. Matched: ${matchedKeywords.join(", ") || "none yet"}. Missing from your resume: ${missingKeywords.join(", ") || "none detected"}. I did not add missing skills without confirmation.`;
  } else if (input.mode === "improve" && input.currentResume) {
    const audit = await auditResumeAgent(
      input.currentResume.content,
      input.currentResume.targetRole || "",
      input.currentResume.jobDescription || "",
      input.metadata,
    );
    candidateContent = await improveResumeAgent(
      input.currentResume.content,
      audit,
      input.currentResume.targetRole || "",
      input.metadata,
    );
    assistantMessage = "Improved the wording and formatting while preserving your original details.";
  } else {
    candidateContent = await writeResumeAgent(
      legacyProfile,
      input.mode,
      input.currentResume?.jobDescription || "",
      input.metadata,
    );
    if (!assistantMessage) assistantMessage = "Created a new resume based on your profile.";
  }

  const targetRole = input.currentResume?.targetRole || profile.target?.targetRoles?.[0] || "Target Role";
  const verified = await verifyResumeCandidate({
    content: candidateContent,
    currentResume: input.currentResume,
    userId: input.userId,
    legacyProfile,
    careerProfile: profile,
    instruction: input.message,
    mode: input.mode,
    targetRole,
    jobDescription: input.mode === "tailor" ? input.message : input.currentResume?.jobDescription,
    metadata: input.metadata,
  });
  const content = verified.content;
  profile = verified.careerProfile;

  if (verified.provenance.removedClaims > 0) {
    assistantMessage += ` Removed ${verified.provenance.removedClaims} unsupported claim${verified.provenance.removedClaims === 1 ? "" : "s"} that could not be linked back to Career Memory evidence.`;
  }

  const now = new Date().toISOString();
  const nextResume = input.currentResume
    ? {
        ...input.currentResume,
        title: verified.validation.cleanedResume.title || input.currentResume.title,
        targetRole,
        mode: input.mode,
        status: "final" as const,
        content,
        score: verified.score,
        audit: verified.audit,
        jobDescription: verified.validation.cleanedResume.target.jobDescription || input.currentResume.jobDescription,
        version: input.currentResume.version + (input.mode === "build" ? 0 : 1),
        updatedAt: now,
      }
    : createResumeRecord({
        userId: input.userId,
        mode: input.mode,
        targetRole,
        content,
        audit: verified.audit,
        title: verified.validation.cleanedResume.title || `${targetRole || "CareerOS"} Resume`,
      });

  nextResume.profile = legacyProfile;
  nextResume.careerProfile = profile;
  if (tailoringResult) {
    nextResume.tailoring = { ...tailoringResult, tailoredResume: content };
  }

  decorateResumeForCareerOS(nextResume, input.message, {
    versionType: input.mode === "tailor" ? "job_specific" : "master",
  });
  await saveServerResume(
    nextResume,
    input.userId,
    input.currentResume ? { expectedVersion: input.currentResume.version } : {},
  );

  return {
    assistantMessage: achievementLogResult
      ? `${assistantMessage}\n\nLogged achievement: ${achievementLogResult.achievement.text}\nSuggested bullet: ${achievementLogResult.suggestedResumeBullet}`
      : assistantMessage,
    resume: nextResume,
    resumeId: nextResume.id,
    versionCreated: input.versionCreated,
    workspace: buildCareerWorkspaceState(nextResume, input.message),
  };
}
