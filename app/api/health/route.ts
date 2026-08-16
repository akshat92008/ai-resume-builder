import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const CORE_ENV = ["NEXT_PUBLIC_APP_URL","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","NVIDIA_NIM_API_KEY","INNGEST_EVENT_KEY","INNGEST_SIGNING_KEY","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","RATE_LIMIT_SALT"] as const;
const BILLING_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRO_PRICE_ID"] as const;

export async function GET() {
  const missingCoreCount = CORE_ENV.filter((key) => !process.env[key]).length;
  const billingConfigured = BILLING_ENV.every((key) => Boolean(process.env[key]));
  const billingPartiallyConfigured = BILLING_ENV.some((key) => Boolean(process.env[key])) && !billingConfigured;
  const ready = missingCoreCount === 0 && !billingPartiallyConfigured;
  return NextResponse.json({ status: ready ? "ready" : "degraded", checks: { coreConfiguration: missingCoreCount === 0, billing: billingConfigured ? "ready" : billingPartiallyConfigured ? "partial" : "disabled", sentry: Boolean(process.env.SENTRY_DSN) }, missingCoreCount, commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null, timestamp: new Date().toISOString() }, { status: ready ? 200 : 503 });
}
