import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { adminApproveOrderSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = adminApproveOrderSchema.parse(await req.json());
    const admin = await requireAdminUser();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
    }

    const { data: order, error: rpcError } = await supabase.rpc("approve_order_and_update_plan", {
      p_order_id: input.order_id,
      p_admin_id: admin.userId,
    });

    if (rpcError) {
      if (rpcError.message.includes("Order not found")) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }
      if (rpcError.message.includes("Cannot approve order") || rpcError.message.includes("Invalid order status") || rpcError.message.includes("Order must belong to a user")) {
        return NextResponse.json({ error: rpcError.message }, { status: 400 });
      }
      return NextResponse.json({ error: `Failed to approve order: ${rpcError.message}` }, { status: 500 });
    }

    await supabase.from("events").insert({
      event_name: "payment_approved",
      metadata: { order_id: input.order_id, plan: order?.plan },
    });

    return NextResponse.json({ ok: true, status: "approved", order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to approve order." }, { status: 400 });
  }
}
