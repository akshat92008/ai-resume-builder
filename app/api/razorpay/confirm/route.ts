import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { fetchRazorpaySubscription, verifyRazorpayPaymentSignature } from "@/lib/careerpath/razorpay";
import { persistRazorpaySubscriptionState, razorpayReconciliationEventId } from "@/lib/careerpath/razorpay-billing-sync";
import { razorpaySubscriptionSnapshot } from "@/lib/careerpath/razorpay-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { isBillingConfigured } from "@/lib/env";
import { logger } from "@/lib/observability/logger";

const ConfirmSchema = z.object({
  paymentId: z.string().trim().min(8).max(255),
  subscriptionId: z.string().trim().min(8).max(255),
  signature: z.string().trim().regex(/^[a-f0-9]{32,128}$/i),
});

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

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "razorpay_confirm", 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many billing confirmations. Please try again later." } },
        { status: 429 },
      );
    }

    const parsed = ConfirmSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT_CONFIRMATION", message: "A valid payment confirmation is required." } },
        { status: 400 },
      );
    }

    const { paymentId, subscriptionId, signature } = parsed.data;
    if (!verifyRazorpayPaymentSignature({ paymentId, subscriptionId, signature })) {
      return NextResponse.json(
        { error: { code: "INVALID_PAYMENT_SIGNATURE", message: "Payment verification failed." } },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: { code: "BILLING_STATE_UNAVAILABLE", message: "Billing state is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const { data: local, error: localError } = await supabase
      .from("user_subscriptions")
      .select("razorpay_subscription_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (localError || local?.razorpay_subscription_id !== subscriptionId) {
      return NextResponse.json(
        { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "Subscription not found for this account." } },
        { status: 404 },
      );
    }

    const subscription = await fetchRazorpaySubscription(subscriptionId);
    if (subscription.plan_id !== process.env.RAZORPAY_PRO_PLAN_ID) {
      logger.error("[api/razorpay/confirm] Subscription plan mismatch", { subscriptionId });
      return NextResponse.json(
        { error: { code: "UNEXPECTED_SUBSCRIPTION", message: "This subscription does not match the configured Pro plan." } },
        { status: 409 },
      );
    }

    const snapshot = razorpaySubscriptionSnapshot(subscription);
    const observedAt = Math.floor(Date.now() / 1000);
    await persistRazorpaySubscriptionState({
      eventId: razorpayReconciliationEventId(`checkout-confirm:${paymentId}`, snapshot),
      eventType: "subscription.checkout.confirmed",
      eventCreated: observedAt,
      userId: auth.user.id,
      snapshot,
    });

    const isPro = snapshot.status === "pro" && Boolean(snapshot.periodEnd && new Date(snapshot.periodEnd) > new Date());
    return NextResponse.json(
      {
        plan: isPro ? "pro" : "free",
        isPro,
        providerStatus: snapshot.providerStatus,
        currentPeriodEnd: snapshot.periodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("[api/razorpay/confirm] Failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: { code: "BILLING_CONFIRM_FAILED", message: "Unable to confirm billing state right now." } },
      { status: 500 },
    );
  }
}
