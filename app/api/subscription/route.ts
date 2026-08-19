import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getEntitlementsForPlan } from "@/lib/careerpath/entitlements";
import { getUserSubscription } from "@/lib/careerpath/stripe";
import { isBillingConfigured } from "@/lib/env";
import { logger } from "@/lib/observability/logger";

export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const subscription = await getUserSubscription();
    const entitlements = getEntitlementsForPlan(subscription.plan);
    return NextResponse.json(
      {
        ...entitlements,
        isPro: subscription.isPro,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        hasBillingAccount: subscription.hasBillingAccount,
        billingConfigured: isBillingConfigured(),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    logger.error("[api/subscription] Failed to load subscription", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: { code: "SUBSCRIPTION_LOAD_FAILED", message: "Unable to load subscription." } },
      { status: 500 },
    );
  }
}
