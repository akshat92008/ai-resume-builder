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

    if (supabase) {
      const { data: order } = await supabase
        .from("orders")
        .select("id,email,plan,user_id,status")
        .eq("id", input.order_id)
        .single();

      if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      const allowedStatuses = ["pending", "created", "submitted"];
      if (!allowedStatuses.includes(order.status)) {
        return NextResponse.json({ error: `Cannot approve order with status: ${order.status}` }, { status: 400 });
      }

      await supabase
        .from("orders")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: admin.userId,
        })
        .eq("id", input.order_id);

      if (order?.user_id) {
        await supabase
          .from("profiles")
          .update({
            plan: order.plan,
            plan_status: "active",
          })
          .eq("id", order.user_id);
      } else if (order?.email) {
        await supabase
          .from("profiles")
          .update({
            plan: order.plan,
            plan_status: "active",
          })
          .eq("email", order.email);
      }

      await supabase.from("events").insert({
        event_name: "payment_approved",
        metadata: { order_id: input.order_id, plan: order?.plan },
      });
    }

    return NextResponse.json({ ok: true, status: "approved" });
  } catch {
    return NextResponse.json({ error: "Unable to approve order." }, { status: 400 });
  }
}
