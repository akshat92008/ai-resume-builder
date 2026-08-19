import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { cancelRazorpaySubscription } from "@/lib/careerpath/razorpay";
import { persistRazorpaySubscriptionState, razorpayReconciliationEventId } from "@/lib/careerpath/razorpay-billing-sync";
import { razorpaySubscriptionSnapshot } from "@/lib/careerpath/razorpay-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "razorpay_cancel", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many billing changes. Please try again later." } },
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
      .select("razorpay_subscription_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error || !local?.razorpay_subscription_id) {
      return NextResponse.json(
        { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "No active billing subscription was found." } },
        { status: 404 },
      );
    }

    const subscription = await cancelRazorpaySubscription(local.razorpay_subscription_id, true);
    const snapshot = razorpaySubscriptionSnapshot(subscription);
    await persistRazorpaySubscriptionState({
      eventId: razorpayReconciliationEventId(`cancel-request:${Math.floor(Date.now() / 1000)}`, snapshot),
      eventType: "subscription.cancel.requested",
      eventCreated: Math.floor(Date.now() / 1000),
      userId: auth.user.id,
      snapshot: { ...snapshot, cancelAtPeriodEnd: true },
    });

    return NextResponse.json(
      {
        cancelledAtPeriodEnd: true,
        currentPeriodEnd: snapshot.periodEnd,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("[api/razorpay/cancel] Failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: { code: "CANCEL_FAILED", message: "Unable to cancel the subscription right now." } },
      { status: 500 },
    );
  }
}
