import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { validatePaidProductionConfiguration } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import { getObservabilityBackend, hasCoreObservability } from "@/lib/observability/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

async function checkDatabase() {
  try {
    const client = createSupabaseAdminClient();
    const { error } = await client.from("profiles").select("id").limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    logger.error("[health] Database readiness check failed", { error });
    return false;
  }
}

async function checkRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const redis = new Redis({ url, token });
    return (await redis.ping()) === "PONG";
  } catch (error) {
    logger.error("[health] Redis readiness check failed", { error });
    return false;
  }
}

export async function GET() {
  const validation = validatePaidProductionConfiguration();
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const coreConfiguration = validation.missingCore.length === 0 && validation.invalidKeys.length === 0;
  const observability = hasCoreObservability();
  const observabilityBackend = getObservabilityBackend();
  const ready = validation.ready && database && redis && observability;

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      paidReady: validation.paidReady && ready,
      checks: {
        coreConfiguration,
        database,
        redis,
        billing: validation.billing,
        observability,
        observabilityBackend,
      },
      missingCoreCount: validation.missingCore.length,
      missingBillingCount: validation.missingBilling.length,
      invalidConfigurationCount: validation.invalidKeys.length,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
