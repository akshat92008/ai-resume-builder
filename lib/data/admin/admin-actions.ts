"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/admin-guard";

export async function getAdminOrdersServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminLeadsServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminUsersServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  return data ?? [];
}

export async function getAdminMetricsServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return { users: 0, orders: 0, leads: 0, resumes: 0, events: 0 };
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { users: 0, orders: 0, leads: 0, resumes: 0, events: 0 };

  const [{ count: usersCount }, { count: ordersCount }, { count: leadsCount }, { count: resumesCount }, { count: eventsCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("resumes").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
  ]);

  return {
    users: usersCount ?? 0,
    orders: ordersCount ?? 0,
    leads: leadsCount ?? 0,
    resumes: resumesCount ?? 0,
    events: eventsCount ?? 0,
  };
}

export async function getAdminEventsServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(1000);
  return data ?? [];
}

export async function getAdminTestimonialsServer() {
  const admin = await requireAdminUser();
  if (!admin.ok) return [];
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function saveAdminTestimonialServer(testimonial: any) {
  const admin = await requireAdminUser();
  if (!admin.ok) throw new Error("Unauthorized");
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("No supabase client");
  
  const validPayload = {
    ...(testimonial.id ? { id: testimonial.id } : {}),
    name: testimonial.name,
    role: testimonial.role,
    college: testimonial.college,
    quote: testimonial.quote,
    rating: testimonial.rating,
    public: testimonial.public,
  };

  const { data, error } = await supabase.from("testimonials").upsert(validPayload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAdminTestimonialServer(id: string) {
  const admin = await requireAdminUser();
  if (!admin.ok) throw new Error("Unauthorized");
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("No supabase client");
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete testimonial: ${error.message}`);
}
