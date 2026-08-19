import { NextResponse } from "next/server";
import { validatePaidProductionConfiguration } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const validation = validatePaidProductionConfiguration();
  const ready = validation.ready;

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      paidReady: validation.paidReady,
      checks: {
        coreConfiguration: validation.missingCore.length === 0 && validation.invalidKeys.length === 0,
        billing: validation.billing,
        observability: Boolean(process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN),
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
