import type { Lead } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase/client";

export async function saveLead(lead: Lead) {
  if (!isSupabaseConfigured) {
    return { ok: true, mode: "local" as const, lead };
  }

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
