import { isSupabaseMode } from "./data/client/mode";
import { getSupabaseBrowserClient } from "./supabase/client";

export async function trackEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  if (!isSupabaseMode()) {
    return { ok: true, mode: "local" as const };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, mode: "supabase" as const, error: "No client" };
  const { error } = await supabase.from("events").insert({
    event_name: eventName,
    metadata,
  });

  return { ok: !error, mode: "supabase" as const, error: error?.message };
}
