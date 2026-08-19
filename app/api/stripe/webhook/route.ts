import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  checkoutSessionCustomerId,
  checkoutSessionSubscriptionId,
  checkoutSessionUserId,
  subscriptionSnapshot,
} from "@/lib/careerpath/billing-state";
import { persistStripeSubscriptionState } from "@/lib/careerpath/billing-sync";
import { getStripeClient } from "@/lib/careerpath/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    logger.error("[api/stripe/webhook] Stripe webhook configuration is incomplete");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const body = await req.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.warn("[api/stripe/webhook] Signature verification failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = checkoutSessionUserId(session);
      const subscriptionId = checkoutSessionSubscriptionId(session);
      const sessionCustomerId = checkoutSessionCustomerId(session);

      if (!userId || !subscriptionId || !sessionCustomerId) {
        throw new Error("Checkout session is missing the user, subscription, or customer mapping.");
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const snapshot = subscriptionSnapshot(subscription);
      if (snapshot.customerId !== sessionCustomerId) {
        throw new Error("Checkout customer does not match the subscription customer.");
      }

      await persistStripeSubscriptionState({
        eventId: event.id,
        eventType: event.type,
        eventCreated: event.created,
        userId,
        snapshot,
      });
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const eventSubscription = event.data.object as Stripe.Subscription;
      // Use Stripe's current object instead of trusting delivery order. This
      // prevents an older webhook delivered later from restoring stale access.
      const liveSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
      const snapshot = subscriptionSnapshot(liveSubscription);
      await persistStripeSubscriptionState({
        eventId: event.id,
        eventType: event.type,
        eventCreated: event.created,
        userId: null,
        snapshot,
      });
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const snapshot = subscriptionSnapshot(subscription);
      snapshot.status = "free";
      await persistStripeSubscriptionState({
        eventId: event.id,
        eventType: event.type,
        eventCreated: event.created,
        userId: null,
        snapshot,
      });
    }

    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("[api/stripe/webhook] Event processing failed", {
      error: error instanceof Error ? error.message : "unknown error",
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
