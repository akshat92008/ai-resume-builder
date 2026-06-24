import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = leadSchema.parse(await req.json());
    const fallbackLead = {
      ...input,
      id: crypto.randomUUID(),
      status: "new" as const,
      created_at: new Date().toISOString(),
    };

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ lead: fallbackLead, mode: "demo" });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        ...input,
        status: "new",
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("events").insert({
      event_name: "lead_created",
      metadata: { lead_id: data.id, type: data.type, source: data.source },
    });

    return NextResponse.json({ lead: data, mode: "supabase" });
  } catch {
    return NextResponse.json({ error: "Unable to save lead." }, { status: 400 });
  }
}
