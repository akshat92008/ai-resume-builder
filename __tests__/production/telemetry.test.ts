import { describe, expect, it } from "vitest";
import { estimateAgentCostUsd, inferProvider, safeErrorSummary } from "@/lib/careerpath/telemetry";

describe("privacy-safe AI telemetry", () => {
  it("does not expose provider error messages or payloads", () => {
    const error = Object.assign(new Error("resume contains private@example.com and secret career history"), {
      status: 429,
      code: "rate_limit",
      responseBody: "sensitive resume content",
    });

    const summary = safeErrorSummary(error);
    expect(summary).toContain("Error");
    expect(summary).toContain("status=429");
    expect(summary).toContain("code=rate_limit");
    expect(summary).not.toContain("private@example.com");
    expect(summary).not.toContain("career history");
    expect(summary).not.toContain("sensitive resume content");
  });

  it("infers the provider from the configured model name", () => {
    expect(inferProvider("meta/llama-3.3-70b-instruct")).toBe("nvidia");
    expect(inferProvider("claude-sonnet-test")).toBe("anthropic");
    expect(inferProvider("gpt-test")).toBe("openai");
    expect(inferProvider("custom-model")).toBe("unknown");
  });

  it("calculates configured token economics without hard-coded provider prices", () => {
    const cost = estimateAgentCostUsd(
      "nvidia",
      { inputTokens: 1_000_000, outputTokens: 500_000, totalTokens: 1_500_000 },
      {
        NVIDIA_INPUT_COST_PER_MILLION_USD: "0.10",
        NVIDIA_OUTPUT_COST_PER_MILLION_USD: "0.30",
      } as NodeJS.ProcessEnv,
    );

    expect(cost).toBe(0.25);
  });

  it("returns no cost estimate when rates are not configured", () => {
    expect(estimateAgentCostUsd("nvidia", { inputTokens: 100 }, {} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});
