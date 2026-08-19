import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as string[],
  responses: new Map<string, { success: boolean; remaining: number }>(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {
    constructor(_config: unknown) {}
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class Ratelimit {
    prefix: string;

    constructor(config: { prefix: string }) {
      this.prefix = config.prefix;
    }

    static slidingWindow(limit: number, duration: string) {
      return { limit, duration };
    }

    async limit(_identifier: string) {
      state.calls.push(this.prefix);
      return state.responses.get(this.prefix) || { success: true, remaining: 99 };
    }
  },
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";

describe("AI quota accounting", () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.responses.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.RATE_LIMIT_SALT = "0123456789abcdef0123456789abcdef";
  });

  it("does not consume the global AI bucket when the feature sublimit denies", async () => {
    state.responses.set("careeros:resume_tailor", { success: false, remaining: 0 });
    state.responses.set("careeros:global_ai_daily", { success: true, remaining: 42 });

    const result = await checkAiActionRateLimit(
      "user-1",
      "203.0.113.10",
      100,
      "resume_tailor",
      30,
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(state.calls).toEqual(["careeros:resume_tailor"]);
  });

  it("checks the shared global budget after an allowed feature action", async () => {
    state.responses.set("careeros:resume_tailor", { success: true, remaining: 12 });
    state.responses.set("careeros:global_ai_daily", { success: true, remaining: 55 });

    const result = await checkAiActionRateLimit(
      "user-1",
      "203.0.113.10",
      100,
      "resume_tailor",
      30,
    );

    expect(result).toEqual({ allowed: true, remaining: 12 });
    expect(state.calls).toEqual(["careeros:resume_tailor", "careeros:global_ai_daily"]);
  });
});
