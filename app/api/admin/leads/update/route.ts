import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { adminLeadUpdateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = adminLeadUpdateSchema.parse(await req.json());
    const admin = await requireAdminUser();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

    const { data, error } = await supabase
      .from("leads")
      .update({ status: input.status })
      .eq("id", input.lead_id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("events").insert({
      event_name: "lead_status_updated",
      metadata: { lead_id: input.lead_id, status: input.status, admin_id: admin.userId },
    });

    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ error: "Unable to update lead." }, { status: 400 });
  }
}
