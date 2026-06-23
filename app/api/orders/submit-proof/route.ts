import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderProofSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = orderProofSchema.parse(await req.json());
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      await supabase
        .from("orders")
        .update({
          payment_reference: input.payment_reference,
          payment_proof_url: input.payment_proof_url,
          status: "submitted",
        })
        .eq("id", input.order_id);
      await supabase.from("events").insert({
        event_name: "payment_submitted",
        metadata: { order_id: input.order_id },
      });
    }

    return NextResponse.json({ ok: true, status: "submitted" });
  } catch {
    return NextResponse.json({ error: "Unable to submit payment proof." }, { status: 400 });
  }
}
