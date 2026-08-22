import { auditResumeAgent } from "@/lib/careerpath/orchestrator";
import { enforceResumeClaimProvenance } from "@/lib/careerloop/provenance";
import { enforceCareerProfileSourceEvidence } from "@/lib/careerloop/profile-source";
import { enforceCareerPathProfileEvidence } from "@/lib/careerpath/profile-evidence-enforce";
import { legacyProfileToCareerProfile } from "@/lib/careerpath/career-os";
import { fallbackResumeAudit, isRuntimeFallbackContent } from "@/lib/careerpath/runtime-fallbacks";
import { normalizeVerifiedResumePresentation } from "@/lib/careerpath/resume-content-normalization";
import { preserveSectionBoundQuantifiedEvidence } from "@/lib/careerpath/section-proof";
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
  useDeterministicAudit?: boolean;
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
  // Keep callers from subsequently persisting the pre-gate extractor object.
  if (rawLegacyProfile && legacyProfile) Object.assign(rawLegacyProfile, legacyProfile);

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

  const fallbackContent = isRuntimeFallbackContent(input.content);
  let content = deriveRenderableResume(validation.cleanedResume);

  // Validation may remove a generative summary sentence that happened to be the
  // only place an explicit metric appeared. Re-bind already source-gated numeric
  // proof to its matching experience/project section before the authoritative
  // provenance pass, so supported user evidence cannot disappear due to layout
  // or wording choices made by the model.
  if (legacyProfile) {
    content = preserveSectionBoundQuantifiedEvidence({
      content,
      profile: legacyProfile,
    });
  }

  const provenance = enforceResumeClaimProvenance(content, evidenceProfile);
  // Provenance decides which facts may survive. The final deterministic
  // presentation pass may only reorganize already-approved skills, restore
  // source-gated education fields, and remove near-identical achievements.
  content = normalizeVerifiedResumePresentation(provenance.content, legacyProfile);

  let audit;
  if (input.useDeterministicAudit || fallbackContent) {
    audit = fallbackResumeAudit(content, input.targetRole, input.jobDescription || "");
  } else {
    try {
      audit = await auditResumeAgent(
        content,
        input.targetRole,
        input.jobDescription || "",
        input.metadata,
      );
    } catch {
      // Audit quality should degrade gracefully when the external model is slow;
      // the canonical truth/provenance checks above are deterministic and remain
      // mandatory. The fallback audit never changes resume facts.
      audit = fallbackResumeAudit(content, input.targetRole, input.jobDescription || "");
    }
  }

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
