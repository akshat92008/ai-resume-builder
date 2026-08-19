import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getStripeClient } from "@/lib/careerpath/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

const CHECKOUT_IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!process.env.STRIPE_SECRET_KEY || !priceId || !appUrl) {
      return NextResponse.json(
        { error: { code: "BILLING_NOT_CONFIGURED", message: "Billing is not configured for this deployment." } },
        { status: 503 },
      );
    }

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "stripe_checkout", 5);
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

    const { data: subscription, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("status, current_period_end, stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (subscriptionError) {
      logger.error("[api/stripe/checkout] Failed to load billing state", { error: subscriptionError });
      return NextResponse.json(
        { error: { code: "BILLING_STATE_UNAVAILABLE", message: "Billing state is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
    const alreadyPro = subscription?.status === "pro" && Boolean(currentPeriodEnd && currentPeriodEnd > new Date());
    if (alreadyPro) {
      return NextResponse.json(
        { error: { code: "ALREADY_SUBSCRIBED", message: "Your Pro subscription is already active." } },
        { status: 409 },
      );
    }

    if (!subscription?.stripe_customer_id && !auth.user.email) {
      return NextResponse.json(
        { error: { code: "EMAIL_REQUIRED", message: "An account email is required to start checkout." } },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();

    // Database state can lag Stripe while webhook delivery is in flight. Before
    // creating another Checkout Session, ask Stripe directly for this customer's
    // live subscriptions so a retry cannot create two paid plans.
    if (subscription?.stripe_customer_id) {
      const liveSubscriptions = await stripe.subscriptions.list({
        customer: subscription.stripe_customer_id,
        status: "all",
        limit: 100,
      });
      const hasLivePro = liveSubscriptions.data.some((item) =>
        (item.status === "active" || item.status === "trialing")
        && item.items.data.some((line) => line.price.id === priceId),
      );
      if (hasLivePro) {
        return NextResponse.json(
          { error: { code: "ALREADY_SUBSCRIBED", message: "Your Pro subscription is already active or activating." } },
          { status: 409 },
        );
      }
    }

    const checkoutWindow = Math.floor(Date.now() / CHECKOUT_IDEMPOTENCY_WINDOW_MS);
    const session = await stripe.checkout.sessions.create({
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: auth.user.email }),
      client_reference_id: auth.user.id,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings?canceled=true`,
      metadata: { userId: auth.user.id },
      subscription_data: { metadata: { userId: auth.user.id } },
    }, {
      // Stripe replays the same POST result for the same key. Combined with the
      // live-subscription check above, this closes both double-click and webhook-lag races.
      idempotencyKey: `careeros-pro-checkout:${auth.user.id}:${checkoutWindow}`,
    });

    if (!session.url) {
      logger.error("[api/stripe/checkout] Stripe returned a checkout session without a URL", { sessionId: session.id });
      return NextResponse.json(
        { error: { code: "CHECKOUT_UNAVAILABLE", message: "Unable to start checkout right now." } },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("[api/stripe/checkout] Failed", { error });
    return NextResponse.json(
      { error: { code: "CHECKOUT_FAILED", message: "Unable to start checkout right now." } },
      { status: 500 },
    );
  }
}
