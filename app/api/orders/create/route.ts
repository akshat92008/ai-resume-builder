import { NextRequest, NextResponse } from "next/server";
import { createPaymentOrder } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderCreateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = orderCreateSchema.parse(await req.json());
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

    input.email = user.email ?? input.email;
    const order = await createPaymentOrder(input);

    await supabase.from("orders").insert({
      id: order.id,
      user_id: user.id,
      email: user.email ?? order.email,
      plan: order.plan,
      amount_inr: order.amount_inr,
      currency: order.currency,
      provider: order.provider,
      status: order.status,
      checkout_url: order.checkout_url,
      metadata: order.metadata ?? {},
    });
    await supabase.from("events").insert({
      event_name: "order_created",
      metadata: { order_id: order.id, plan: order.plan, amount_inr: order.amount_inr, provider: order.provider },
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to create order." }, { status: 400 });
  }
}
