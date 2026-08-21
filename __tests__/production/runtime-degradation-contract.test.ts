import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const resumeHandlers = read("inngest/handlers/resume-handlers.ts");
const differentiationHandlers = read("inngest/handlers/differentiation-handlers.ts");
const verifiedResume = read("lib/careerpath/verified-resume.ts");
const appState = read("app/api/app-state/route.ts");
const memoryRoute = read("app/api/memory/route.ts");
const improveRoute = read("app/api/resume/improve/route.ts");
const tailorRoute = read("app/api/resume/tailor/route.ts");

describe("production runtime degradation contract", () => {
  it("keeps core resume generation available when provider-backed stages time out", () => {
    expect(resumeHandlers).toContain("fallbackResumeFromProfile");
    expect(resumeHandlers).toContain("fallbackResumeAudit");
    expect(resumeHandlers).toContain("fallbackImproveResume");
    expect(resumeHandlers).toContain("fallbackTailorResume");
    expect(verifiedResume).toContain("isRuntimeFallbackContent");
    expect(verifiedResume).toContain("fallbackResumeAudit");
  });

  it("keeps dedicated improve/tailor/humanize paths available without inventing facts", () => {
    expect(improveRoute).toContain("fallbackImproveResume");
    expect(tailorRoute).toContain("fallbackTailorResume");
    expect(differentiationHandlers).toContain("fallbackHumanizedResume");
    expect(differentiationHandlers).toContain("verifyResumeCandidate");
  });

  it("normalizes old and new Career Memory draft content before workspace derivation", () => {
    expect(memoryRoute).toContain('content: createEmptyResumeContent("User")');
    expect(memoryRoute).not.toContain("as unknown as import");
    expect(appState).toContain("resume.content = normalizeResumeContent(resume.content)");
    expect(resumeHandlers).toContain("normalizeResumeContent");
    expect(differentiationHandlers).toContain("normalizeResumeContent");
  });
});
