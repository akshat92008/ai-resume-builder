import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/admin-guard";
import { adminUserPlanUpdateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = adminUserPlanUpdateSchema.parse(await req.json());
    const admin = await requireAdminUser();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });

    const { data, error } = await supabase
      .from("profiles")
      .update({ plan: input.plan, plan_status: "active" })
      .eq("id", input.user_id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("events").insert({
      event_name: "admin_user_plan_updated",
      metadata: { user_id: input.user_id, plan: input.plan, admin_id: admin.userId },
    });

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "Unable to update user plan." }, { status: 400 });
  }
}
