import { NextRequest, NextResponse } from "next/server";
import { createPaymentOrder } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderCreateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = orderCreateSchema.parse(await req.json());
    const order = await createPaymentOrder(input);
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      await supabase.from("orders").insert({
        id: order.id,
        email: order.email,
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
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to create order." }, { status: 400 });
  }
}
