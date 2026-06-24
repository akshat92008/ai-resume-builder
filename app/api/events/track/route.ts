import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eventTrackSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const input = eventTrackSchema.parse(await req.json());
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      await supabase.from("events").insert({
        event_name: input.event_name,
        metadata: input.metadata,
      });
    }

    return NextResponse.json({ ok: true, mode: supabase ? "supabase" : "demo" });
  } catch {
    return NextResponse.json({ error: "Unable to track event." }, { status: 400 });
  }
}
