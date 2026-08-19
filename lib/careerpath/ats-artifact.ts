import type { CareerPathResumeContent } from "./types";
import { resumeContentToPdfLines } from "./pdf-renderer";

export type ATSArtifactVerification = {
  artifactScore: number;
  textCoverage: number;
  sectionCoverage: number;
  verified: boolean;
  missingSections: string[];
  missingSignals: string[];
  warnings: string[];
  extractedCharacters: number;
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(value: string) { return normalize(value).split(" ").filter((token) => token.length >= 2); }
function expectedSections(content: CareerPathResumeContent) {
  return [["summary", Boolean(content.summary)], ["skills", content.skills.length > 0], ["experience", content.experience.length > 0], ["projects", content.projects.length > 0], ["education", content.education.length > 0], ["certifications", content.certifications.length > 0], ["achievements", content.achievements.length > 0], ["languages", content.languages.length > 0]] as const;
}

export function verifyExtractedResumeText(content: CareerPathResumeContent, extractedText: string): ATSArtifactVerification {
  const extracted = normalize(extractedText);
  const extractedTokenSet = new Set(tokens(extractedText));
  const expectedLines = resumeContentToPdfLines(content).map((line) => normalize(line.text)).filter(Boolean);
  const expectedTokenSet = new Set(expectedLines.flatMap(tokens));
  let matchedTokens = 0;
  for (const token of expectedTokenSet) if (extractedTokenSet.has(token)) matchedTokens += 1;
  const textCoverage = expectedTokenSet.size ? matchedTokens / expectedTokenSet.size : 1;

  const sections = expectedSections(content).filter(([, required]) => required);
  const missingSections = sections.filter(([name]) => !new RegExp(`\\b${name}\\b`, "i").test(extracted)).map(([name]) => name);
  const sectionCoverage = sections.length ? (sections.length - missingSections.length) / sections.length : 1;

  const importantSignals = [content.header.name, ...content.experience.flatMap((item) => [item.company, item.role]), ...content.projects.map((item) => item.name), ...content.education.map((item) => item.institution)].map((value) => normalize(String(value || ""))).filter((value) => value.length >= 3);
  const missingSignals = importantSignals.filter((signal) => !extracted.includes(signal)).slice(0, 12);
  const artifactScore = Math.max(0, Math.min(100, Math.round(textCoverage * 80 + sectionCoverage * 20)));
  const warnings: string[] = [];
  if (textCoverage < 0.98) warnings.push(`Only ${Math.round(textCoverage * 100)}% of expected resume tokens survived PDF extraction.`);
  if (missingSections.length) warnings.push(`Parser could not reliably recover section heading${missingSections.length === 1 ? "" : "s"}: ${missingSections.join(", ")}.`);
  if (missingSignals.length) warnings.push(`Important identity/evidence text was not recovered: ${missingSignals.join("; ")}.`);
  if (extractedText.trim().length < 120) warnings.push("Extracted PDF text is unexpectedly short.");
  return { artifactScore, textCoverage: Math.round(textCoverage * 1000) / 10, sectionCoverage: Math.round(sectionCoverage * 1000) / 10, verified: artifactScore >= 95 && missingSections.length === 0 && missingSignals.length === 0, missingSections, missingSignals, warnings, extractedCharacters: extractedText.length };
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Invalid PDF signature");
  const globals = globalThis as unknown as Record<string, unknown>;
  if (typeof globals.DOMMatrix === "undefined") globals.DOMMatrix = class DOMMatrix {};
  if (typeof globals.Path2D === "undefined") globals.Path2D = class Path2D {};
  if (typeof globals.ImageData === "undefined") globals.ImageData = class ImageData {};
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (input: Buffer) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return String(result.text || "").trim();
}

export async function verifyResumePdfArtifact(content: CareerPathResumeContent, buffer: Buffer) {
  return verifyExtractedResumeText(content, await extractPdfText(buffer));
}
