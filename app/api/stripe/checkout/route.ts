import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { stripe } from "@/lib/careerpath/stripe";

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "price_dummy";

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const user = auth.user;
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer_email: user.email,
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[api/stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
