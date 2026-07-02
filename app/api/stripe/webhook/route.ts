import { NextResponse } from "next/server";
import { stripe } from "@/lib/careerpath/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error: any) {
    console.error("[api/stripe/webhook] Error verifying webhook signature:", error);
    return NextResponse.json({ error: "Webhook Error: " + error.message }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata.userId;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (userId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await supabase.from("user_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: "pro",
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any;
    await supabase.from("user_subscriptions").update({
      status: subscription.status === "active" ? "pro" : "free",
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any;
    await supabase.from("user_subscriptions").update({
      status: "free",
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
