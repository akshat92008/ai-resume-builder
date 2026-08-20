import { auditResumeAgent } from "@/lib/careerpath/orchestrator";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";
import { enforceCareerProfileSourceEvidence } from "@/lib/careerloop/profile-source";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
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
  const rawLegacyProfile = input.legacyProfile ?? input.currentResume?.profile ?? null;
  const existingCareerProfile = input.careerProfile ?? input.currentResume?.careerProfile ?? null;
  if (!rawLegacyProfile && !existingCareerProfile) {
    throw new Error("Resume verification requires Career Memory evidence.");
  }

  // The LLM-normalized legacy profile is not itself evidence. Reconcile every
  // factual field against cumulative raw user notes before conversion, then run
  // the richer CareerProfile through the same raw-input evidence boundary.
  const legacyProfile = rawLegacyProfile
    ? enforceCareerPathProfileEvidence(rawLegacyProfile)
    : null;
  const rawSourceEvidence = [
    input.instruction,
    legacyProfile?.rawNotes || "",
    legacyProfile?.existingResumeText || "",
    ...(existingCareerProfile?.rawInputs || []).map((item) => item.content),
  ].filter(Boolean).join("\n\n");

  const candidateEvidenceProfile = existingCareerProfile
    || legacyProfileToCareerProfile(legacyProfile!, input.userId, input.instruction);
  const evidenceProfile = enforceCareerProfileSourceEvidence(candidateEvidenceProfile, rawSourceEvidence);

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

  // Only raw user-authored sources plus the source-gated Career Memory projection
  // are allowed to support a persisted resume claim.
  const sourceEvidence = [
    rawSourceEvidence,
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
    legacyProfile,
    validation,
    provenance: provenance.report,
  };
}
