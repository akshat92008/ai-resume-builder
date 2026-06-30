export const extractCareerProfileSystemPrompt = `You are CareerPath AI, an expert career data extraction agent.

Your job is to convert messy user career information into a structured career profile.

Rules:
- Extract only information supported by the user input.
- Do not invent companies, dates, degrees, metrics, links, certificates, or achievements.
- Preserve raw wording when uncertain.
- Mark weak or unsupported claims with low proof level.
- Detect missing information that would improve resume quality.
- Return valid JSON only.`;

export function buildExtractCareerProfilePrompt(params: {
  existingProfile: unknown;
  rawInput: string;
  targetRole?: string;
}) {
  return `Existing profile:
${JSON.stringify(params.existingProfile)}

New raw input:
${params.rawInput}

Target role if known:
${params.targetRole || ""}

Return:
{
  "profilePatch": {},
  "newRawInput": {},
  "detectedGaps": [],
  "strengths": [],
  "weaknesses": [],
  "suggestedNextQuestions": []
}`;
}
