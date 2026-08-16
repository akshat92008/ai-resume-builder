import { describe, expect, it } from "vitest";
import { getEntitlementsForPlan } from "@/lib/careerpath/entitlements";
import { CreateJobApplicationSchema, UpdateJobApplicationSchema } from "@/lib/careerpath/job-validation";
import { stripePeriodEndIso, stripeSubscriptionStatusToPlan } from "@/lib/careerpath/stripe-state";
import { validateProductionConfiguration } from "@/lib/env";

const validProductionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  AI_PROVIDER: "nvidia",
  NVIDIA_NIM_API_KEY: "nim-key",
  NVIDIA_NIM_BASE_URL: "https://integrate.api.nvidia.com/v1",
  INNGEST_EVENT_KEY: "event-key",
  INNGEST_SIGNING_KEY: "signing-key",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  RATE_LIMIT_SALT: "a-long-random-salt-value",
  SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
  NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
};

describe("production configuration", () => {
  it("accepts a complete core configuration with billing disabled", () => {
    const result = validateProductionConfiguration(validProductionEnv);
    expect(result.ready).toBe(true);
    expect(result.billing).toBe("disabled");
    expect(result.missingCore).toEqual([]);
    expect(result.invalidKeys).toEqual([]);
  });

  it("fails closed for mock AI and weak rate-limit salt", () => {
    const result = validateProductionConfiguration({
      ...validProductionEnv,
      AI_PROVIDER: "mock",
      RATE_LIMIT_SALT: "short",
    });
    expect(result.ready).toBe(false);
    expect(result.invalidKeys).toContain("AI_PROVIDER");
    expect(result.invalidKeys).toContain("RATE_LIMIT_SALT");
  });

  it("rejects partially configured billing", () => {
    const result = validateProductionConfiguration({
      ...validProductionEnv,
      STRIPE_SECRET_KEY: "sk_test_example",
    });
    expect(result.ready).toBe(false);
    expect(result.billing).toBe("partial");
  });

  it("accepts a complete Stripe configuration", () => {
    const result = validateProductionConfiguration({
      ...validProductionEnv,
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      STRIPE_PRO_PRICE_ID: "price_example",
    });
    expect(result.ready).toBe(true);
    expect(result.billing).toBe("ready");
  });
});

describe("Stripe state mapping", () => {
  it("grants Pro only for active or trialing subscriptions", () => {
    expect(stripeSubscriptionStatusToPlan("active")).toBe("pro");
    expect(stripeSubscriptionStatusToPlan("trialing")).toBe("pro");
    expect(stripeSubscriptionStatusToPlan("past_due")).toBe("free");
    expect(stripeSubscriptionStatusToPlan("canceled")).toBe("free");
  });

  it("converts valid period timestamps and preserves missing values", () => {
    expect(stripePeriodEndIso({ current_period_end: 1_700_000_000 })).toBe("2023-11-14T22:13:20.000Z");
    expect(stripePeriodEndIso({ current_period_end: null })).toBeNull();
  });
});

describe("production entitlements", () => {
  it("keeps free usage deliberately constrained", () => {
    const free = getEntitlementsForPlan("free");
    expect(free.aiActionsPerDay).toBe(3);
    expect(free.tailoringPerDay).toBe(1);
    expect(free.outreachPerDay).toBe(1);
  });

  it("gives pro materially higher server-enforced quotas", () => {
    const free = getEntitlementsForPlan("free");
    const pro = getEntitlementsForPlan("pro");
    expect(pro.aiActionsPerDay).toBeGreaterThan(free.aiActionsPerDay);
    expect(pro.tailoringPerDay).toBeGreaterThan(free.tailoringPerDay);
    expect(pro.outreachPerDay).toBeGreaterThan(free.outreachPerDay);
  });
});

describe("job application validation", () => {
  it("accepts the minimum valid job payload", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "saved" }).success).toBe(true);
  });

  it("rejects unsupported statuses and unsafe URL schemes", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "hacked" }).success).toBe(false);
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", jobUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("strips ownership fields from PATCH payloads", () => {
    const parsed = UpdateJobApplicationSchema.parse({ status: "interview", id: "attacker-controlled", userId: "attacker-controlled" });
    expect(parsed).toEqual({ status: "interview" });
  });
});
