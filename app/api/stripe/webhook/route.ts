import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/careerpath/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  if (!webhookSecret) {
    logger.error("[api/stripe/webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    logger.warn("[api/stripe/webhook] Error verifying webhook signature", { error });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (userId && subscriptionId && customerId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: "pro",
        current_period_end: getSubscriptionPeriodEnd(subscription),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase.from("user_subscriptions").update({
      status: subscription.status === "active" ? "pro" : "free",
      current_period_end: getSubscriptionPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase.from("user_subscriptions").update({
      status: "free",
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return new Date((periodEnd || Math.floor(Date.now() / 1000)) * 1000).toISOString();
}
