import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/careerpath/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripePeriodEndIso, stripeSubscriptionStatusToPlan } from "@/lib/careerpath/stripe-state";
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
    logger.warn("[api/stripe/webhook] Signature verification failed", { error });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    logger.error("[api/stripe/webhook] Supabase admin client is unavailable");
    return NextResponse.json({ error: "Billing persistence is unavailable." }, { status: 503 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId || session.client_reference_id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (!userId || !subscriptionId || !customerId) {
        throw new Error("Checkout session is missing the user, subscription, or customer mapping.");
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscriptionEvent(supabase, {
        event,
        userId,
        customerId,
        subscriptionId,
        status: stripeSubscriptionStatusToPlan(subscription.status),
        periodEnd: stripePeriodEndIso(subscription),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      await applySubscriptionEvent(supabase, {
        event,
        userId: null,
        customerId,
        subscriptionId: subscription.id,
        status: event.type === "customer.subscription.deleted" ? "free" : stripeSubscriptionStatusToPlan(subscription.status),
        periodEnd: stripePeriodEndIso(subscription),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }

    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("[api/stripe/webhook] Event processing failed", { error, eventId: event.id, eventType: event.type });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function applySubscriptionEvent(
  supabase: Exclude<ReturnType<typeof createSupabaseAdminClient>, null>,
  input: {
    event: Stripe.Event;
    userId: string | null;
    customerId: string;
    subscriptionId: string;
    status: "free" | "pro";
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  },
) {
  const { error } = await supabase.rpc("apply_stripe_subscription_event", {
    p_event_id: input.event.id,
    p_event_type: input.event.type,
    p_event_created: input.event.created,
    p_user_id: input.userId,
    p_customer_id: input.customerId,
    p_subscription_id: input.subscriptionId,
    p_status: input.status,
    p_current_period_end: input.periodEnd,
    p_cancel_at_period_end: input.cancelAtPeriodEnd,
  });

  if (error) throw new Error(`Stripe event persistence failed: ${error.message}`);
}
