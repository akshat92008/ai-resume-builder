import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const verifiedResume = readFileSync(join(root, "lib/careerpath/verified-resume.ts"), "utf8");
const handler = readFileSync(join(root, "inngest/handlers/resume-handlers.ts"), "utf8");
const tailorRoute = readFileSync(join(root, "app/api/resume/tailor/route.ts"), "utf8");
const pdfRoute = readFileSync(join(root, "app/api/resume/[id]/pdf/route.ts"), "utf8");

describe("Aug 23 production tailoring truth contract", () => {
  it("never treats a tailor/improve instruction as candidate evidence", () => {
    expect(verifiedResume).toContain('const factualInstruction = input.mode === "build" ? input.instruction : "";');
    expect(verifiedResume).not.toMatch(/const rawSourceEvidence = \[\s*input\.instruction/);
    expect(verifiedResume).toContain("enforceResumeFactualIdentityBoundary(content, evidenceProfile)");
  });

  it("reconciles chat tailoring metadata after final verification against the resolved JD", () => {
    expect(handler).toContain("resolveTailoringJobDescription(input.message, input.currentResume?.jobDescription)");
    expect(handler).toContain("reconcileVerifiedTailoringResult(tailoringResult, content, resolvedJobDescription)");
    expect(handler).toContain("nextResume.tailoring = tailoringResult");
    expect(handler).toContain('const profileSeedInput = input.mode === "build" ? input.message : legacyProfile.rawNotes || "";');
    expect(handler).toContain('jobDescription: input.mode === "tailor" ? resolvedJobDescription : input.currentResume?.jobDescription');
  });

  it("reconciles the standalone tailoring endpoint after final verification", () => {
    expect(tailorRoute).toContain("const verifiedTailoring = reconcileVerifiedTailoringResult(");
    expect(tailorRoute).toContain("tailored.tailoring = verifiedTailoring");
    expect(tailorRoute).toContain("matchScore: verifiedTailoring.matchScore");
    expect(tailorRoute).toContain("missingKeywords: verifiedTailoring.missingKeywordsNotAdded");
  });

  it("exports only canonical persisted resume content", () => {
    expect(pdfRoute).toContain("renderResumePdf(resume.content)");
    expect(pdfRoute).toContain("verifyResumePdfArtifact(resume.content, pdf)");
    expect(pdfRoute).not.toContain("resume.tailoring.tailoredResume");
  });
});
