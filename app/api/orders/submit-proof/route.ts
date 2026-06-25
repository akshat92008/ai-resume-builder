import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderProofSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = orderProofSchema.parse(await req.json());
    const supabaseAdmin = createSupabaseAdminClient();
    const supabase = await createServerSupabaseClient();

    if (!supabaseAdmin || !supabase) {
      return NextResponse.json({ error: "Cannot submit proofs in demo mode." }, { status: 403 });
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("user_id, email, status")
      .eq("id", input.order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const isOwner = (user && user.id === order.user_id) || (user && user.email === order.email);
    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const allowedStatuses = ["created", "pending", "submitted"];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ error: `Cannot submit proof for order with status: ${order.status}` }, { status: 400 });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_reference: input.payment_reference,
        payment_proof_url: input.payment_proof_url,
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.order_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Failed to update payment proof." }, { status: 500 });
    }

    await supabaseAdmin.from("events").insert({
      event_name: "payment_submitted",
      metadata: { order_id: input.order_id },
    });

    return NextResponse.json({ ok: true, status: "submitted", order: updatedOrder });
  } catch {
    return NextResponse.json({ error: "Unable to submit payment proof." }, { status: 400 });
  }
}
