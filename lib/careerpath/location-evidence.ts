import type { CareerPathProfile } from "./types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexible(value: string) {
  return value.trim().split(/\s+/).map(escapeRegExp).join("\\s+");
}

function explicitLocationEvidence(
  location: string,
  evidence: string,
  kind: "personal" | "education",
) {
  const clean = location.trim();
  if (!clean) return false;
  const loc = flexible(clean);
  const common = [
    new RegExp(`\\b(?:location|located|based|live|living|reside|residing)\\s*(?:is|:|-)?\\s*(?:in\\s+)?${loc}\\b`, "i"),
    new RegExp(`\\b(?:my\\s+)?(?:current\\s+)?location\\s*(?:is|:|-)\\s*${loc}\\b`, "i"),
  ];
  if (common.some((pattern) => pattern.test(evidence))) return true;

  if (kind === "education") {
    return [
      new RegExp(`\\b(?:education|college|university|school|campus)\\s+location\\s*(?:is|:|-)\\s*${loc}\\b`, "i"),
      new RegExp(`\\b(?:college|university|school|campus)\\s+(?:is\\s+)?located\\s+in\\s+${loc}\\b`, "i"),
      new RegExp(`\\b(?:study|studying)\\s+(?:at\\s+[^.!?\\n]{1,100}\\s+)?in\\s+${loc}\\b`, "i"),
    ].some((pattern) => pattern.test(evidence));
  }

  return false;
}

/**
 * Location strings are especially prone to false support because city names
 * often occur inside university names. Keep only locations that the user
 * explicitly supplied as locations; do not turn world knowledge or name tokens
 * into resume facts. Legacy experience rows do not carry a location field, so
 * their richer Career Memory location can only originate from source-gated data.
 */
export function stripUnsourcedProfileLocations(
  profile: CareerPathProfile,
  evidence: string,
): CareerPathProfile {
  return {
    ...profile,
    personal: {
      ...profile.personal,
      location: profile.personal.location && explicitLocationEvidence(profile.personal.location, evidence, "personal")
        ? profile.personal.location
        : undefined,
    },
    education: profile.education.map((item) => ({
      ...item,
      location: item.location && explicitLocationEvidence(item.location, evidence, "education")
        ? item.location
        : "",
    })),
  };
}
