import type { Lead } from "./types";
import { isSupabaseMode } from "./data/mode";
import { getSupabaseBrowserClient } from "./supabase/client";

export async function saveLead(lead: Lead) {
  if (!isSupabaseMode()) {
    return { ok: true, mode: "local" as const, lead };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, mode: "supabase" as const, lead, error: "No client" };

  const { error } = await supabase.from("leads").insert({
    type: lead.type,
    name: lead.name,
    email: lead.email,
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    course: lead.course ?? "",
    college: lead.college ?? "",
    company: lead.company ?? "",
    role: lead.role ?? "",
    message: lead.message ?? "",
    source: lead.source ?? "",
    metadata: lead.metadata ?? {},
    status: lead.status ?? "new",
  });

  return { ok: !error, mode: "supabase" as const, lead, error: error?.message };
}
