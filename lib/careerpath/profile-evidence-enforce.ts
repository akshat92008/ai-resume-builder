import type { CareerPathProfile } from "./types";
import { reconcileExtractedProfileWithEvidence } from "./profile-evidence";
import { stripUnsourcedProfileLocations } from "./location-evidence";
import { recoverStructuredProfileEvidence } from "./structured-profile-recovery";

function emptyEvidenceProfile(profile: CareerPathProfile): CareerPathProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    personal: {},
    target: { role: "", industry: "", experienceLevel: "" },
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
    confidenceNotes: [],
  };
}

/**
 * CareerPathProfile.rawNotes is append-only user-authored source material. Run
 * the structured profile back through the evidence gate before it is converted
 * into Career Memory, so an extractor-only invention cannot become provenance.
 */
export function enforceCareerPathProfileEvidence(profile: CareerPathProfile): CareerPathProfile {
  const evidence = [profile.rawNotes, profile.existingResumeText].filter(Boolean).join("\n\n");
  if (!evidence.trim()) return profile;

  const gated = reconcileExtractedProfileWithEvidence({
    message: evidence,
    existing: emptyEvidenceProfile(profile),
    extracted: profile,
  });
  const structuredRecovered = recoverStructuredProfileEvidence(gated);
  const locationGated = stripUnsourcedProfileLocations(structuredRecovered, evidence);

  return {
    ...locationGated,
    id: profile.id,
    userId: profile.userId,
    rawNotes: profile.rawNotes,
    existingResumeText: profile.existingResumeText,
  };
}
