import { NextRequest, NextResponse } from "next/server";
import { createPaymentOrder } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderCreateSchema } from "@/lib/validations";
import { pricingPlans, manualServicePacks } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const input = orderCreateSchema.parse(await req.json());
    const knownPlan = pricingPlans.find((p) => p.id === input.plan) || manualServicePacks.find((p) => p.id === input.plan);
    if (!knownPlan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }
    if (knownPlan.price !== input.amount_inr) {
      return NextResponse.json({ error: "Price mismatch. Please refresh and try again." }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const userClient = await createServerSupabaseClient();
    
    if (!supabase || !userClient) {
      return NextResponse.json({ error: "Cannot create real orders in demo mode." }, { status: 403 });
    }

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in to create an order." }, { status: 401 });
    }

    let finalEmail = user.email;
    if (!finalEmail) {
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
      finalEmail = profile?.email;
    }

    if (!finalEmail) {
      return NextResponse.json({ error: "Your account email is missing. Please update your profile before payment." }, { status: 400 });
    }

    const safeInput = {
      ...input,
      email: finalEmail,
    };
    const order = await createPaymentOrder(safeInput);

    const { error: insertError } = await supabase.from("orders").insert({
      id: order.id,
      user_id: user.id,
      email: finalEmail,
      plan: order.plan,
      amount_inr: order.amount_inr,
      currency: order.currency,
      provider: order.provider,
      status: order.status,
      checkout_url: order.checkout_url,
      metadata: order.metadata ?? {},
    });

    if (insertError) {
      return NextResponse.json({ error: "Unable to create order. Please try again." }, { status: 500 });
    }

    await supabase.from("events").insert({
      event_name: "order_created",
      metadata: { order_id: order.id, plan: order.plan, amount_inr: order.amount_inr, provider: order.provider },
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to create order." }, { status: 400 });
  }
}
