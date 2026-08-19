import { auditResumeAgent } from "@/lib/careerpath/orchestrator";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";
import {
  legacyProfileToCareerProfile,
  refreshCareerProfileInsights,
} from "@/lib/careerpath/career-os";
import { deriveRenderableResume } from "@/lib/resume/render";
import { contentToResumeState } from "@/lib/resume/types";
import { validateResumeTruthfulness } from "@/lib/resume/validator";
import type {
  CareerPathProfile,
  CareerPathResume,
  CareerPathResumeContent,
} from "@/lib/careerpath/types";

export type VerifiedResumeMode = "build" | "improve" | "tailor";

type VerificationMetadata = {
  userId: string;
  resumeId?: string;
};

export async function verifyResumeCandidate(input: {
  content: CareerPathResumeContent;
  currentResume: CareerPathResume | null;
  userId: string;
  legacyProfile?: CareerPathProfile | null;
  careerProfile?: CareerPathResume["careerProfile"] | null;
  instruction: string;
  mode: VerifiedResumeMode;
  targetRole: string;
  jobDescription?: string;
  metadata?: VerificationMetadata;
}) {
  const legacyProfile = input.legacyProfile ?? input.currentResume?.profile ?? null;
  const existingCareerProfile = input.careerProfile ?? input.currentResume?.careerProfile ?? null;
  if (!legacyProfile && !existingCareerProfile) {
    throw new Error("Resume verification requires Career Memory evidence.");
  }

  const evidenceProfile = existingCareerProfile
    ? refreshCareerProfileInsights(existingCareerProfile)
    : legacyProfileToCareerProfile(legacyProfile!, input.userId, input.instruction);

  const beforeState = input.currentResume
    ? contentToResumeState(input.currentResume.content, {
        id: input.currentResume.id,
        targetRole: input.currentResume.targetRole,
      })
    : null;

  const afterState = contentToResumeState(input.content, {
    id: input.currentResume?.id || "new",
    targetRole: input.targetRole,
  });

  const validationMode = input.mode === "tailor"
    ? "TAILOR_TO_JOB"
    : input.mode === "improve"
      ? "IMPROVE_EXISTING_RESUME"
      : "BUILD_FROM_DATA";

  // Validate against all durable Career Memory evidence, not just the latest
  // command, so supported metrics survive while newly invented claims do not.
  const sourceEvidence = [
    input.instruction,
    legacyProfile ? JSON.stringify(legacyProfile) : "",
    JSON.stringify(evidenceProfile),
  ].join("\n");

  const validation = validateResumeTruthfulness(
    beforeState,
    afterState,
    sourceEvidence,
    {
      type: validationMode,
      confidence: 1,
      reason: "Canonical verified resume pipeline",
      needsLlm: true,
      needsCurrentResume: Boolean(input.currentResume),
      hasEnoughData: true,
    },
  );

  let content = deriveRenderableResume(validation.cleanedResume);
  const provenance = enforceResumeClaimProvenance(content, evidenceProfile);
  content = provenance.content;

  const audit = await auditResumeAgent(
    content,
    input.targetRole,
    input.jobDescription || "",
    input.metadata,
  );

  return {
    content,
    audit,
    score: audit.score,
    careerProfile: evidenceProfile,
    validation,
    provenance: provenance.report,
  };
}
