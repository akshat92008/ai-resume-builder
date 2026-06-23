import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminApproveOrderSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = adminApproveOrderSchema.parse(await req.json());
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const approvedBy = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.approved_by)
        ? input.approved_by
        : null;
      const { data: order } = await supabase
        .from("orders")
        .select("id,email,plan,user_id")
        .eq("id", input.order_id)
        .single();

      await supabase
        .from("orders")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
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
