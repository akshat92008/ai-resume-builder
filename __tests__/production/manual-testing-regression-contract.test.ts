import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("manual production testing regression contract", () => {
  it("uses the canonical production intent router in the resume-agent endpoint", () => {
    const route = source("app/api/resume-agent/route.ts");
    expect(route).toContain('from "@/lib/careerpath/intent-router"');
    expect(route).not.toMatch(/inferIntentKeyword, inferIntentLLM[^\n]+careerpath\/orchestrator/);
  });

  it("keeps deterministic Career Memory reads outside the AI quota", () => {
    const route = source("app/api/resume-agent/route.ts");
    expect(route).toContain("isReadOnlyCareerMemoryQuery(message)");
    expect(route).toContain("deterministicNoAi");
    expect(route).toContain("!deterministicNoAi && intentUsesAi");
  });

  it("does not fake a 30 second cooldown for a daily AI quota", () => {
    const chat = source("components/careerpath/workspace/ChatInterface.tsx");
    expect(chat).not.toContain("Date.now() + 30_000");
    expect(chat).toContain("retryAfterSeconds");
    expect(chat).toContain('response.headers.get("retry-after")');
  });

  it("gives a free account enough AI actions for onboarding plus one core workflow", () => {
    const entitlements = source("lib/careerpath/entitlements.ts");
    expect(entitlements).toContain("free: { aiActionsPerDay: 12");
  });
});
