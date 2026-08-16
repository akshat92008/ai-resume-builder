import { z } from "zod";

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
  OPENAI_API_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  RATE_LIMIT_SALT: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const envValidation = envSchema.safeParse(process.env);

// Never fall back to raw, unvalidated process.env values. Optional configuration is
// represented as undefined and production readiness is evaluated explicitly below.
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

const BILLING_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRO_PRICE_ID"] as const;

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
    if (!source.STRIPE_SECRET_KEY?.startsWith("sk_")) invalid.add("STRIPE_SECRET_KEY");
    if (!source.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) invalid.add("STRIPE_WEBHOOK_SECRET");
    if (!source.STRIPE_PRO_PRICE_ID?.startsWith("price_")) invalid.add("STRIPE_PRO_PRICE_ID");
  }

  const invalidKeys = [...invalid].sort();
  return {
    ready: missingCore.length === 0 && invalidKeys.length === 0 && !billingPartial,
    missingCore,
    invalidKeys,
    billing: billingConfigured ? "ready" as const : billingPartial ? "partial" as const : "disabled" as const,
  };
}
