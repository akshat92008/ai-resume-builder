import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import {
  checkoutSessionSubscriptionId,
  checkoutSessionUserId,
  subscriptionSnapshot,
} from "@/lib/careerpath/billing-state";
import { persistStripeSubscriptionState, reconciliationEventId } from "@/lib/careerpath/billing-sync";
import { getStripeClient } from "@/lib/careerpath/stripe";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

const ConfirmSchema = z.object({
  sessionId: z.string().trim().min(8).max(255),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json(
        { error: { code: "BILLING_NOT_CONFIGURED", message: "Billing is not configured for this deployment." } },
        { status: 503 },
      );
    }

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "stripe_confirm", 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many billing confirmations. Please try again later." } },
        { status: 429 },
      );
    }

    const parsed = ConfirmSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_CHECKOUT_SESSION", message: "A valid checkout session is required." } },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
    const ownerId = checkoutSessionUserId(session);
    if (!ownerId || ownerId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "CHECKOUT_NOT_FOUND", message: "Checkout session not found for this account." } },
        { status: 404 },
      );
    }

    if (session.mode !== "subscription") {
      return NextResponse.json(
        { error: { code: "INVALID_CHECKOUT_MODE", message: "This checkout is not a subscription purchase." } },
        { status: 400 },
      );
    }

    const subscriptionId = checkoutSessionSubscriptionId(session);
    if (!subscriptionId) {
      return NextResponse.json(
        { error: { code: "SUBSCRIPTION_PENDING", message: "Subscription activation is still pending." } },
        { status: 409 },
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const snapshot = subscriptionSnapshot(subscription);
    const expectedPrice = process.env.STRIPE_PRO_PRICE_ID;
    const hasExpectedPrice = subscription.items.data.some((item) => item.price.id === expectedPrice);
    if (!hasExpectedPrice) {
      logger.error("[api/stripe/confirm] Checkout subscription has an unexpected price", {
        subscriptionId: subscription.id,
        userId: auth.user.id,
      });
      return NextResponse.json(
        { error: { code: "UNEXPECTED_SUBSCRIPTION", message: "This subscription does not match the configured Pro plan." } },
        { status: 409 },
      );
    }

    const observedAt = Math.floor(Date.now() / 1000);
    await persistStripeSubscriptionState({
      eventId: reconciliationEventId(session.id, snapshot),
      eventType: "checkout.session.reconciled",
      eventCreated: observedAt,
      userId: auth.user.id,
      snapshot,
    });

    return NextResponse.json(
      {
        plan: snapshot.status,
        isPro: snapshot.status === "pro" && Boolean(snapshot.periodEnd && new Date(snapshot.periodEnd) > new Date()),
        currentPeriodEnd: snapshot.periodEnd,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("[api/stripe/confirm] Failed", { error });
    return NextResponse.json(
      { error: { code: "BILLING_CONFIRM_FAILED", message: "Unable to confirm billing state right now." } },
      { status: 500 },
    );
  }
}
