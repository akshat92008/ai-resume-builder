import type { Lead } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase/client";
import { saveDemoLead } from "./storage";

export async function saveLead(lead: Lead) {
  const localLead = saveDemoLead({ ...lead, status: lead.status ?? "new" });

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "local" as const, lead: localLead };
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

  return { ok: !error, mode: "supabase" as const, lead: localLead, error: error?.message };
}
