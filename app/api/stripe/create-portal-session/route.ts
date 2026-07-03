import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { stripe } from "@/lib/careerpath/stripe";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "stripe_portal", 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings`;

    // To use customer portal, the user must have a Stripe customer ID.
    // In a real app, this would be fetched from the database:
    // const customerId = await getStripeCustomerId(auth.user.id);
    // Since this is a demo, we'll try to find a customer by email, or return an error.

    const customers = await stripe.customers.list({ email: auth.user.email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: { message: "No active subscription found. You must be subscribed to access the portal." } },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[api/stripe/create-portal-session] Error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Failed to create portal session" } },
      { status: 500 }
    );
  }
}
