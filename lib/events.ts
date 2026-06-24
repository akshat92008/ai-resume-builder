import { supabase, isSupabaseConfigured } from "./supabase/client";

export async function trackEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  if (!isSupabaseConfigured) {
    return { ok: true, mode: "local" as const };
  }

  const { error } = await supabase.from("events").insert({
    event_name: eventName,
    metadata,
  });

  return { ok: !error, mode: "supabase" as const, error: error?.message };
}
