import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getStripeClient } from "@/lib/careerpath/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!process.env.STRIPE_SECRET_KEY || !appUrl) {
      return NextResponse.json(
        { error: { code: "BILLING_NOT_CONFIGURED", message: "Billing is not configured for this deployment." } },
        { status: 503 },
      );
    }

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user.id, ipHash, "stripe_portal", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
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

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      logger.error("[api/stripe/create-portal-session] Failed to load customer mapping", { error });
      return NextResponse.json(
        { error: { code: "BILLING_STATE_UNAVAILABLE", message: "Billing state is temporarily unavailable." } },
        { status: 503 },
      );
    }

    if (!data?.stripe_customer_id) {
      return NextResponse.json(
        { error: { code: "NO_SUBSCRIPTION", message: "No Stripe subscription is linked to this account." } },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("[api/stripe/create-portal-session] Failed", { error });
    return NextResponse.json(
      { error: { code: "PORTAL_FAILED", message: "Unable to open the billing portal right now." } },
      { status: 500 },
    );
  }
}
