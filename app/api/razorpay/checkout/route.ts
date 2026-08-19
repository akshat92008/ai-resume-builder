import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { createRazorpaySubscription, fetchRazorpaySubscription } from "@/lib/careerpath/razorpay";
import { persistRazorpaySubscriptionState } from "@/lib/careerpath/razorpay-billing-sync";
import { razorpaySubscriptionSnapshot } from "@/lib/careerpath/razorpay-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { isBillingConfigured } from "@/lib/env";
import { logger } from "@/lib/observability/logger";

function checkoutPayload(subscriptionId: string, email?: string | null) {
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    subscriptionId,
    name: "CareerOS",
    description: "CareerOS Pro subscription",
    prefill: email ? { email } : {},
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    if (!isBillingConfigured()) {
      return NextResponse.json(
        { error: { code: "BILLING_NOT_CONFIGURED", message: "Paid billing is not configured for this deployment." } },
        { status: 503 },
      );
    }

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "razorpay_checkout", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many checkout attempts. Please try again later." } },
        { status: 429 },
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: { code: "BILLING_STATE_UNAVAILABLE", message: "Billing state is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const { data: local, error } = await supabase
      .from("user_subscriptions")
      .select("razorpay_subscription_id, razorpay_status, status, current_period_end")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      logger.error("[api/razorpay/checkout] Failed to load billing state", { error: error.message });
      return NextResponse.json(
        { error: { code: "BILLING_STATE_UNAVAILABLE", message: "Billing state is temporarily unavailable." } },
        { status: 503 },
      );
    }

    if (local?.razorpay_subscription_id) {
      try {
        const existing = await fetchRazorpaySubscription(local.razorpay_subscription_id);
        if (existing.plan_id !== process.env.RAZORPAY_PRO_PLAN_ID) {
          return NextResponse.json(
            { error: { code: "BILLING_PLAN_MISMATCH", message: "The existing billing record does not match the configured Pro plan." } },
            { status: 409 },
          );
        }

        if (existing.status === "active") {
          return NextResponse.json(
            { error: { code: "ALREADY_SUBSCRIBED", message: "Your Pro subscription is already active." } },
            { status: 409 },
          );
        }

        if (["created", "authenticated", "pending"].includes(existing.status)) {
          return NextResponse.json(checkoutPayload(existing.id, auth.user.email), {
            headers: { "Cache-Control": "no-store" },
          });
        }

        if (existing.status === "halted") {
          return NextResponse.json(
            { error: { code: "SUBSCRIPTION_HALTED", message: "Your existing subscription needs billing attention before a new subscription can be created." } },
            { status: 409 },
          );
        }
      } catch (lookupError) {
        logger.warn("[api/razorpay/checkout] Existing provider subscription lookup failed", {
          error: lookupError instanceof Error ? lookupError.message : "unknown error",
        });
        return NextResponse.json(
          { error: { code: "BILLING_PROVIDER_UNAVAILABLE", message: "Unable to verify your existing billing state right now." } },
          { status: 503 },
        );
      }
    }

    const created = await createRazorpaySubscription({ userId: auth.user.id, email: auth.user.email });
    const snapshot = razorpaySubscriptionSnapshot(created);
    await persistRazorpaySubscriptionState({
      eventId: `subscription-created:${created.id}`,
      eventType: "subscription.created.local",
      eventCreated: created.created_at || Math.floor(Date.now() / 1000),
      userId: auth.user.id,
      snapshot,
    });

    return NextResponse.json(checkoutPayload(created.id, auth.user.email), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error("[api/razorpay/checkout] Failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: { code: "CHECKOUT_FAILED", message: "Unable to start checkout right now." } },
      { status: 500 },
    );
  }
}
