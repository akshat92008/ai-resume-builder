import { fallbackTailorResume } from "./runtime-fallbacks";
import type { CareerPathResumeContent, CareerPathTailoringResult } from "./types";

/**
 * The model may propose tailoring metadata, but persisted fit signals must be
 * derived from the final truth-checked resume. This keeps Studio, API responses,
 * and exported content consistent after unsupported claims are removed.
 */
export function reconcileVerifiedTailoringResult(
  original: CareerPathTailoringResult,
  verifiedContent: CareerPathResumeContent,
  jobDescription: string,
): CareerPathTailoringResult {
  const verified = fallbackTailorResume(verifiedContent, jobDescription);
  return {
    ...original,
    matchScore: verified.matchScore,
    matchedKeywords: verified.matchedKeywords,
    safeKeywordsAdded: [],
    missingKeywordsNotAdded: verified.missingKeywordsNotAdded,
    tailoringSummary: [
      `Verified fit after truth checks: ${verified.matchedKeywords.length} matched and ${verified.missingKeywordsNotAdded.length} unsupported requirements left out.`,
    ],
    tailoredResume: verifiedContent,
  };
}
