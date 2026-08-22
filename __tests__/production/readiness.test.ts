import { describe, expect, it } from "vitest";
import { getEntitlementsForPlan, PRODUCT_CAPS_DISABLED_FOR_TESTING } from "@/lib/careerpath/entitlements";
import { CreateJobApplicationSchema, UpdateJobApplicationSchema } from "@/lib/careerpath/job-validation";
import { razorpayPeriodEndIso, razorpayStatusToPlan } from "@/lib/careerpath/razorpay-state";
import { validatePaidProductionConfiguration, validateProductionConfiguration } from "@/lib/env";
import { getObservabilityBackend, hasCoreObservability } from "@/lib/observability/backend";

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
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
};

const paidProductionEnv: NodeJS.ProcessEnv = {
  ...validProductionEnv,
  RAZORPAY_KEY_ID: "rzp_live_example",
  RAZORPAY_KEY_SECRET: "razorpay-secret",
  RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
  RAZORPAY_PRO_PLAN_ID: "plan_example",
  RAZORPAY_PRO_TOTAL_COUNT: "120",
};

describe("production configuration", () => {
  it("accepts a complete core configuration with billing disabled", () => {
    const result = validateProductionConfiguration(validProductionEnv);
    expect(result.ready).toBe(true);
    expect(result.billing).toBe("disabled");
  });

  it("validates observability separately from functional core configuration", () => {
    const withoutSentry: NodeJS.ProcessEnv = { ...validProductionEnv };
    delete withoutSentry.SENTRY_DSN;
    delete withoutSentry.NEXT_PUBLIC_SENTRY_DSN;
    const result = validateProductionConfiguration(withoutSentry);
    expect(result.ready).toBe(true);
    expect(result.missingCore).not.toContain("SENTRY_DSN");
    expect(result.missingCore).not.toContain("NEXT_PUBLIC_SENTRY_DSN");
  });

  it("requires a real support contact before commercial core readiness", () => {
    const withoutSupport: NodeJS.ProcessEnv = { ...validProductionEnv };
    delete withoutSupport.NEXT_PUBLIC_SUPPORT_EMAIL;
    const result = validateProductionConfiguration(withoutSupport);
    expect(result.ready).toBe(false);
    expect(result.missingCore).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
  });

  it("does not call a billing-disabled deployment paid-ready", () => {
    const result = validatePaidProductionConfiguration(validProductionEnv);
    expect(result.ready).toBe(true);
    expect(result.paidReady).toBe(false);
    expect(result.missingBilling).toEqual([
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "RAZORPAY_PRO_PLAN_ID",
      "RAZORPAY_PRO_TOTAL_COUNT",
    ]);
  });

  it("marks a fully configured Razorpay deployment paid-ready", () => {
    const result = validatePaidProductionConfiguration(paidProductionEnv);
    expect(result.ready).toBe(true);
    expect(result.billing).toBe("ready");
    expect(result.paidReady).toBe(true);
    expect(result.missingBilling).toEqual([]);
  });

  it("fails closed for mock AI and weak rate-limit salt", () => {
    const result = validateProductionConfiguration({ ...validProductionEnv, AI_PROVIDER: "mock", RATE_LIMIT_SALT: "short" });
    expect(result.ready).toBe(false);
    expect(result.invalidKeys).toContain("AI_PROVIDER");
    expect(result.invalidKeys).toContain("RATE_LIMIT_SALT");
  });

  it("rejects partially configured billing", () => {
    const result = validateProductionConfiguration({ ...validProductionEnv, RAZORPAY_KEY_ID: "rzp_test_example" });
    expect(result.ready).toBe(false);
    expect(result.billing).toBe("partial");
  });
});

describe("production observability", () => {
  it("uses Sentry when both browser and server DSNs are configured", () => {
    expect(getObservabilityBackend(validProductionEnv)).toBe("sentry");
    expect(hasCoreObservability(validProductionEnv)).toBe(true);
  });

  it("uses Vercel structured runtime/browser telemetry for a controlled beta", () => {
    const vercelEnv: NodeJS.ProcessEnv = {
      ...validProductionEnv,
      VERCEL: "1",
      VERCEL_ENV: "production",
    };
    delete vercelEnv.SENTRY_DSN;
    delete vercelEnv.NEXT_PUBLIC_SENTRY_DSN;
    expect(getObservabilityBackend(vercelEnv)).toBe("vercel-runtime");
    expect(hasCoreObservability(vercelEnv)).toBe(true);
  });

  it("fails closed when no supported observability backend exists", () => {
    const noObservability: NodeJS.ProcessEnv = { ...validProductionEnv };
    delete noObservability.SENTRY_DSN;
    delete noObservability.NEXT_PUBLIC_SENTRY_DSN;
    expect(getObservabilityBackend(noObservability)).toBe("none");
    expect(hasCoreObservability(noObservability)).toBe(false);
  });
});

describe("Razorpay state mapping", () => {
  it("grants Pro only for active subscriptions", () => {
    expect(razorpayStatusToPlan("active")).toBe("pro");
    expect(razorpayStatusToPlan("authenticated")).toBe("free");
    expect(razorpayStatusToPlan("pending")).toBe("free");
    expect(razorpayStatusToPlan("halted")).toBe("free");
    expect(razorpayStatusToPlan("cancelled")).toBe("free");
    expect(razorpayStatusToPlan("completed")).toBe("free");
    expect(razorpayStatusToPlan("expired")).toBe("free");
  });

  it("uses Razorpay current_end as the entitlement boundary", () => {
    expect(razorpayPeriodEndIso({ id: "sub_x", entity: "subscription", plan_id: "plan_x", status: "active", current_end: 1_700_000_000 })).toBe("2023-11-14T22:13:20.000Z");
    expect(razorpayPeriodEndIso({ id: "sub_x", entity: "subscription", plan_id: "plan_x", status: "created", current_end: null })).toBeNull();
  });
});

describe("production entitlements", () => {
  it("temporarily disables product usage caps for full manual feature certification", () => {
    const free = getEntitlementsForPlan("free");
    const pro = getEntitlementsForPlan("pro");

    expect(PRODUCT_CAPS_DISABLED_FOR_TESTING).toBe(true);
    expect(free.aiActionsPerDay).toBeGreaterThanOrEqual(100_000);
    expect(free.tailoringPerDay).toBeGreaterThanOrEqual(100_000);
    expect(free.outreachPerDay).toBeGreaterThanOrEqual(100_000);
    expect(pro.aiActionsPerDay).toBe(free.aiActionsPerDay);
    expect(pro.tailoringPerDay).toBe(free.tailoringPerDay);
    expect(pro.outreachPerDay).toBe(free.outreachPerDay);
  });
});

describe("job application validation", () => {
  it("accepts the minimum valid job payload", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "saved" }).success).toBe(true);
  });

  it("rejects unsupported statuses and unsafe URL schemes", () => {
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", status: "hacked" }).success).toBe(false);
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", jobUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(CreateJobApplicationSchema.safeParse({ company: "Amaura Labs", role: "AI Engineer", jobUrl: "http://example.com/job" }).success).toBe(false);
  });

  it("rejects ownership fields from PATCH payloads", () => {
    const parsed = UpdateJobApplicationSchema.safeParse({ status: "interview", id: "attacker-controlled", userId: "attacker-controlled" });
    expect(parsed.success).toBe(false);
  });
});
