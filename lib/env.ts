import { z } from "zod";

const optionalNonNegativeNumberString = z.string().refine((value) => {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}, "Must be a non-negative number when configured").optional();

const positiveIntegerString = z.string().refine((value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1;
}, "Must be a positive integer").optional();

export const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(["nvidia", "mock"]).optional(),
  NVIDIA_NIM_API_KEY: z.string().min(1).optional(),
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_NIM_BASE_URL: z.string().url().optional(),
  NVIDIA_NIM_MODEL: z.string().min(1).optional(),
  NVIDIA_NIM_MODEL_FAST: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_FALLBACK_MODEL: z.string().min(1).optional(),
  ANTHROPIC_FALLBACK_MODEL_FAST: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_FALLBACK_MODEL: z.string().min(1).optional(),
  OPENAI_FALLBACK_MODEL_FAST: z.string().min(1).optional(),
  NVIDIA_INPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  NVIDIA_OUTPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  ANTHROPIC_INPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  ANTHROPIC_OUTPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  OPENAI_INPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  OPENAI_OUTPUT_COST_PER_MILLION_USD: optionalNonNegativeNumberString,
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  RATE_LIMIT_SALT: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(8).optional(),
  RAZORPAY_PRO_PLAN_ID: z.string().min(1).optional(),
  RAZORPAY_PRO_TOTAL_COUNT: positiveIntegerString,
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const envValidation = envSchema.safeParse(process.env);
export const env: Partial<AppEnv> = envValidation.success ? envValidation.data : {};

const REQUIRED_PRODUCTION_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NVIDIA_NIM_API_KEY",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_SALT",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

export const BILLING_KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RAZORPAY_PRO_PLAN_ID",
  "RAZORPAY_PRO_TOTAL_COUNT",
] as const;

function firstPathSegment(issue: { path: PropertyKey[] }): string | null {
  const value = issue.path[0];
  return typeof value === "string" ? value : null;
}

export function validateProductionConfiguration(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source);
  const missingCore = REQUIRED_PRODUCTION_KEYS.filter((key) => !source[key]?.trim());
  const invalid = new Set<string>();

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = firstPathSegment(issue);
      if (key) invalid.add(key);
    }
  }

  if (source.AI_PROVIDER === "mock") invalid.add("AI_PROVIDER");
  if ((source.RATE_LIMIT_SALT || "").length < 16) invalid.add("RATE_LIMIT_SALT");

  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "UPSTASH_REDIS_REST_URL", "NVIDIA_NIM_BASE_URL"] as const) {
    const value = source[key];
    if (!value) continue;
    try {
      if (new URL(value).protocol !== "https:") invalid.add(key);
    } catch {
      invalid.add(key);
    }
  }

  const billingConfiguredCount = BILLING_KEYS.filter((key) => Boolean(source[key]?.trim())).length;
  const billingConfigured = billingConfiguredCount === BILLING_KEYS.length;
  const billingPartial = billingConfiguredCount > 0 && !billingConfigured;

  if (billingConfigured) {
    if (!source.RAZORPAY_KEY_ID?.startsWith("rzp_")) invalid.add("RAZORPAY_KEY_ID");
    if ((source.RAZORPAY_KEY_SECRET || "").length < 8) invalid.add("RAZORPAY_KEY_SECRET");
    if ((source.RAZORPAY_WEBHOOK_SECRET || "").length < 8) invalid.add("RAZORPAY_WEBHOOK_SECRET");
    if (!source.RAZORPAY_PRO_PLAN_ID?.startsWith("plan_")) invalid.add("RAZORPAY_PRO_PLAN_ID");
    const totalCount = Number(source.RAZORPAY_PRO_TOTAL_COUNT);
    if (!Number.isInteger(totalCount) || totalCount < 1) invalid.add("RAZORPAY_PRO_TOTAL_COUNT");
  }

  const invalidKeys = [...invalid].sort();
  return {
    ready: missingCore.length === 0 && invalidKeys.length === 0 && !billingPartial,
    missingCore,
    invalidKeys,
    billing: billingConfigured ? "ready" as const : billingPartial ? "partial" as const : "disabled" as const,
  };
}

export function validatePaidProductionConfiguration(source: NodeJS.ProcessEnv = process.env) {
  const core = validateProductionConfiguration(source);
  const missingBilling = BILLING_KEYS.filter((key) => !source[key]?.trim());
  return {
    ...core,
    paidReady: core.ready && core.billing === "ready" && missingBilling.length === 0,
    missingBilling,
  };
}

export function isBillingConfigured(source: NodeJS.ProcessEnv = process.env) {
  return validatePaidProductionConfiguration(source).paidReady;
}
