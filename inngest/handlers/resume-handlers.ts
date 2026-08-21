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
import { reconcileExtractedProfileWithEvidence } from "@/lib/careerpath/profile-evidence";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import {
  mergeDeterministicProfileEvidence,
  preserveDeterministicResumeEvidence,
} from "@/lib/careerpath/deterministic-evidence";
import {
  fallbackImproveResume,
  fallbackResumeAudit,
  fallbackResumeFromProfile,
  fallbackTailorResume,
} from "@/lib/careerpath/runtime-fallbacks";
import { normalizeResumeContent } from "@/lib/careerpath/resume-content-normalization";
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
  currentResume.content = normalizeResumeContent(currentResume.content);
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
  currentResume.content = normalizeResumeContent(currentResume.content);
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
  if (currentResume) currentResume.content = normalizeResumeContent(currentResume.content);
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
  currentResume.content = normalizeResumeContent(currentResume.content);
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

  currentResume.content = normalizeResumeContent(currentResume.content);
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
  if (input.currentResume) input.currentResume.content = normalizeResumeContent(input.currentResume.content);
  let legacyProfile: CareerPathProfile = input.currentResume?.profile || emptyCareerPathProfile(input.userId);
  const existingCareerProfile = input.currentResume?.careerProfile
    ? refreshCareerProfileInsights(input.currentResume.careerProfile)
    : null;
  let profile = existingCareerProfile || legacyProfileToCareerProfile(legacyProfile, input.userId, input.message);
  let achievementLogResult: ReturnType<typeof applyAchievementLog>["result"] | null = null;
  let assistantMessage = "";
  let degradedByProvider = false;

  if (input.mode === "build") {
    const previousLegacyProfile = legacyProfile;
    const extractedLegacyProfile = await extractProfileDataAgent(
      input.message,
      previousLegacyProfile,
      input.currentResume?.targetRole || "",
      input.metadata,
    );

    // Source-gate extraction before the writer ever sees it. Then recover a
    // conservative subset of explicit first-person facts directly from the
    // authenticated message so provider timeouts cannot collapse a new user's
    // Career Memory to an empty profile.
    legacyProfile = reconcileExtractedProfileWithEvidence({
      message: input.message,
      existing: previousLegacyProfile,
      extracted: extractedLegacyProfile,
    });
    legacyProfile = mergeDeterministicProfileEvidence({
      message: input.message,
      profile: legacyProfile,
      targetRole: input.currentResume?.targetRole || "",
    });
    legacyProfile = enforceCareerPathProfileEvidence(legacyProfile);

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
    try {
      tailoringResult = await tailorResumeAgent(
        input.currentResume.content,
        input.currentResume.targetRole || "",
        jobDesc,
        input.metadata,
      );
    } catch {
      degradedByProvider = true;
      tailoringResult = fallbackTailorResume(input.currentResume.content, jobDesc);
    }
    candidateContent = tailoringResult.tailoredResume;
    missingKeywords = tailoringResult.missingKeywordsNotAdded;
    matchedKeywords = tailoringResult.matchedKeywords;
    assistantMessage = `Tailored the resume toward the job. Matched: ${matchedKeywords.join(", ") || "none yet"}. Missing from your resume: ${missingKeywords.join(", ") || "none detected"}. I did not add missing skills without confirmation.`;
  } else if (input.mode === "improve" && input.currentResume) {
    let audit;
    try {
      audit = await auditResumeAgent(
        input.currentResume.content,
        input.currentResume.targetRole || "",
        input.currentResume.jobDescription || "",
        input.metadata,
      );
    } catch {
      degradedByProvider = true;
      audit = fallbackResumeAudit(
        input.currentResume.content,
        input.currentResume.targetRole || "",
        input.currentResume.jobDescription || "",
      );
    }
    try {
      candidateContent = await improveResumeAgent(
        input.currentResume.content,
        audit,
        input.currentResume.targetRole || "",
        input.metadata,
      );
    } catch {
      degradedByProvider = true;
      candidateContent = fallbackImproveResume(input.currentResume.content);
    }
    assistantMessage = "Improved the wording and formatting while preserving your original details.";
  } else {
    try {
      candidateContent = await writeResumeAgent(
        legacyProfile,
        input.mode,
        input.currentResume?.jobDescription || "",
        input.metadata,
      );
    } catch {
      degradedByProvider = true;
      candidateContent = fallbackResumeFromProfile(legacyProfile);
    }
    if (!assistantMessage) assistantMessage = "Created a new resume based on your profile.";
  }

  // Generative writing may rephrase supported evidence, but it must not erase
  // source-backed proof such as explicit test counts. For tailor/improve we only
  // preserve previously gated Career Memory facts; job-description numbers are
  // never treated as candidate evidence.
  candidateContent = preserveDeterministicResumeEvidence({
    content: candidateContent,
    profile: legacyProfile,
    message: input.mode === "build" ? input.message : "",
  });

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
  if (degradedByProvider) {
    assistantMessage += " The external AI service was slow, so CareerOS used its source-backed fallback and kept the operation available without inventing facts.";
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
        // Version is the optimistic-concurrency token for the whole persisted
        // resume aggregate, not only visible document revisions. Every mutation
        // must advance it so two concurrent writes cannot both succeed.
        version: input.currentResume.version + 1,
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
