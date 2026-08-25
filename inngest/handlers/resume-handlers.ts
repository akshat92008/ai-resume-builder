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
  extractJobDescription,
  generateSmartResumeVersions,
  isAchievementLogInput,
  legacyProfileToCareerProfile,
  mergeCareerMemory,
  refreshCareerProfileInsights,
} from "@/lib/careerpath/career-os";
import { saveServerResume, saveResumeVersion } from "@/lib/careerpath/db";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { reconcileVerifiedTailoringResult } from "@/lib/careerpath/tailoring-verification";
import { reconcileExtractedProfileWithEvidence } from "@/lib/careerpath/profile-evidence";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import {
  looksLikeComprehensiveStructuredCareerProfile,
  looksLikeStructuredCareerProfile,
} from "@/lib/careerpath/structured-profile-recovery";
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

/**
 * Distinguish a real pasted JD from a short command that merely refers to one.
 * The production recording exposed why this matters: "Tailor my resume for the
 * Nova Systems role" was previously treated as the JD itself, erasing the
 * stored Requirements block and yielding matched=0/missing=0 on provider fallback.
 */
export function looksLikeEmbeddedJobDescription(message: string) {
  const text = message.trim();
  if (!text) return false;
  if (/(?:^|\n)\s*(?:job description|requirements?|responsibilities|qualifications|preferred(?: qualifications)?|about the role|what you(?:'|’)ll do|what we(?:'|’)re looking for)\s*:/im.test(text)) return true;
  const bulletCount = (text.match(/(?:^|\n)\s*[-*•]\s+/g) || []).length;
  return text.length >= 280 && bulletCount >= 2 && /\b(?:requirements?|responsibilities|qualifications|we are looking|preferred)\b/i.test(text);
}

export function resolveTailoringJobDescription(message: string, storedJobDescription?: string | null) {
  if (looksLikeEmbeddedJobDescription(message)) return message.trim();
  if (storedJobDescription?.trim()) return storedJobDescription.trim();
  return message.trim();
}

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
  decorateResumeForCareerOS(currentResume);
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
  const profileSeedInput = input.mode === "build" ? input.message : legacyProfile.rawNotes || "";
  let profile = existingCareerProfile || legacyProfileToCareerProfile(legacyProfile, input.userId, profileSeedInput);
  let achievementLogResult: ReturnType<typeof applyAchievementLog>["result"] | null = null;
  let assistantMessage = "";
  let degradedByProvider = false;
  const structuredProfileInput = input.mode === "build" && looksLikeStructuredCareerProfile(input.message);
  const comprehensiveStructuredProfileInput = input.mode === "build"
    && looksLikeComprehensiveStructuredCareerProfile(input.message);
  const resolvedJobDescription = input.mode === "tailor"
    ? resolveTailoringJobDescription(input.message, input.currentResume?.jobDescription)
    : input.currentResume?.jobDescription || "";

  if (input.mode === "build") {
    const previousLegacyProfile = legacyProfile;
    const extractedLegacyProfile = structuredProfileInput
      ? {
          ...previousLegacyProfile,
          rawNotes: [previousLegacyProfile.rawNotes, input.message].filter(Boolean).join("\n\n"),
        }
      : await extractProfileDataAgent(
          input.message,
          previousLegacyProfile,
          input.currentResume?.targetRole || "",
          input.metadata,
        );

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
    const mergedCareerProfile = mergeCareerMemory(existingCareerProfile, extractedCareerProfile);
    if (comprehensiveStructuredProfileInput && existingCareerProfile) {
      const hasDirectEmail = /(?:^|\n)\s*Email\s*:/i.test(input.message);
      profile = refreshCareerProfileInsights({
        ...mergedCareerProfile,
        personal: {
          ...mergedCareerProfile.personal,
          ...extractedCareerProfile.personal,
          email: hasDirectEmail ? extractedCareerProfile.personal.email : mergedCareerProfile.personal.email,
        },
        education: extractedCareerProfile.education,
        experience: extractedCareerProfile.experience,
        projects: extractedCareerProfile.projects,
        skills: extractedCareerProfile.skills,
        achievements: extractedCareerProfile.achievements,
      });
    } else {
      profile = mergedCareerProfile;
    }
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
    try {
      tailoringResult = await tailorResumeAgent(
        input.currentResume.content,
        input.currentResume.targetRole || "",
        resolvedJobDescription,
        input.metadata,
      );
    } catch {
      degradedByProvider = true;
      tailoringResult = fallbackTailorResume(input.currentResume.content, resolvedJobDescription);
    }
    candidateContent = tailoringResult.tailoredResume;
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

  candidateContent = preserveDeterministicResumeEvidence({
    content: candidateContent,
    profile: legacyProfile,
    message: input.mode === "build" ? input.message : "",
  });

  const resolvedJob = input.mode === "tailor" && resolvedJobDescription
    ? extractJobDescription(resolvedJobDescription)
    : null;
  const existingTargetRole = input.currentResume?.targetRole && input.currentResume.targetRole !== "Target Role"
    ? input.currentResume.targetRole
    : "";
  const targetRole = resolvedJob?.title || existingTargetRole || profile.target?.targetRoles?.[0] || "Target Role";
  const verified = await verifyResumeCandidate({
    content: candidateContent,
    currentResume: input.currentResume,
    userId: input.userId,
    legacyProfile,
    careerProfile: profile,
    instruction: input.message,
    mode: input.mode,
    targetRole,
    jobDescription: input.mode === "tailor" ? resolvedJobDescription : input.currentResume?.jobDescription,
    metadata: input.metadata,
  });
  const content = verified.content;
  profile = verified.careerProfile;

  if (tailoringResult && input.mode === "tailor") {
    tailoringResult = reconcileVerifiedTailoringResult(tailoringResult, content, resolvedJobDescription);
    missingKeywords = tailoringResult.missingKeywordsNotAdded;
    matchedKeywords = tailoringResult.matchedKeywords;
    assistantMessage = `Tailored the resume toward the job. Matched: ${matchedKeywords.join(", ") || "none yet"}. Missing from your resume: ${missingKeywords.join(", ") || "none detected"}. I did not add missing skills or experience without Career Memory evidence.`;
  }

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
        jobDescription: input.mode === "tailor"
          ? resolvedJobDescription
          : verified.validation.cleanedResume.target.jobDescription || input.currentResume.jobDescription,
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
    nextResume.tailoring = tailoringResult;
  }

  decorateResumeForCareerOS(
    nextResume,
    input.mode === "build" ? input.message : input.mode === "tailor" ? resolvedJobDescription : undefined,
    { versionType: input.mode === "tailor" ? "job_specific" : "master" },
  );
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
    workspace: buildCareerWorkspaceState(nextResume, input.mode === "tailor" ? resolvedJobDescription : input.message),
  };
}
