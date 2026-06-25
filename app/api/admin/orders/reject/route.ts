import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { adminRejectOrderSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = adminRejectOrderSchema.parse(await req.json());
    const admin = await requireAdminUser();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

    const { data: order } = await supabase.from("orders").select("metadata,plan,status").eq("id", input.order_id).maybeSingle();
    
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const allowedStatuses = ["created", "pending", "submitted"];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ error: `Cannot reject order with status: ${order.status}` }, { status: 400 });
    }

    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        status: "rejected",
        metadata: { ...((order?.metadata as Record<string, unknown> | null) ?? {}), rejection_reason: input.reason },
      })
      .eq("id", input.order_id)
      .select()
      .single();

    if (orderUpdateError || !updatedOrder) {
      return NextResponse.json({ error: `Failed to reject order: ${orderUpdateError?.message || "Unknown error"}` }, { status: 500 });
    }

    await supabase.from("events").insert({
      event_name: "payment_rejected",
      metadata: { order_id: input.order_id, plan: order?.plan, admin_id: admin.userId },
    });

    return NextResponse.json({ ok: true, status: "rejected", order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reject order." }, { status: 400 });
  }
}
