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
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });

    await supabase.from("events").insert({
      event_name: "admin_user_plan_updated",
      metadata: { user_id: input.user_id, plan: input.plan, admin_id: admin.userId },
    });

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update user plan." }, { status: 400 });
  }
}
