import { supabase } from "./supabase/client";
import type { Job, Lead, Order, Profile, Resume, Testimonial, UserVault } from "./types";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
  };
};

type CreateOrderInput = {
  email: string;
  plan: string;
  amount_inr: number;
  provider?: Order["provider"];
  metadata?: Record<string, unknown>;
};

type PaymentProofInput = {
  order_id: string;
  payment_reference: string;
  payment_proof_url?: string;
};

export type AdminEvent = {
  id?: string;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminMetrics = {
  users: number;
  orders: number;
  leads: number;
  resumes: number;
  events: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

function defaultProfile(user: AuthUser): Profile {
  const email = user.email ?? "";
  const fallbackName = user.user_metadata?.full_name ?? email.split("@")[0] ?? "";

  return {
    id: user.id,
    full_name: fallbackName,
    email,
    phone: "",
    city: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    target_roles: [],
    headline: "",
    summary: "",
    public_slug: "",
    portfolio_public: false,
    role: "user",
    plan: "free",
    plan_status: "active",
    pro_until: null,
    referral_code: "",
    referred_by: null,
  };
}

function emptyVault(user: AuthUser): UserVault {
  return {
    profile: defaultProfile(user),
    education: [],
    skills: [],
    projects: [],
    experiences: [],
    certificates: [],
    achievements: [],
    proof_links: [],
  };
}

function profileForUpsert(vault: UserVault, user: AuthUser) {
  const profile: Record<string, unknown> = {
    ...vault.profile,
    id: user.id,
    email: vault.profile.email || user.email || "",
  };

  if (!profile.public_slug) profile.public_slug = null;
  if (!profile.referral_code) profile.referral_code = null;
  if (!profile.referred_by) profile.referred_by = null;
  return profile;
}

function listRowForSupabase(item: Record<string, unknown>, userId: string) {
  const row: Record<string, unknown> = { ...item, user_id: userId };
  if (typeof row.id === "string" && !uuidPattern.test(row.id)) {
    delete row.id;
  }
  if (row.related_id === "") row.related_id = null;
  if (row.related_type === "") row.related_type = null;
  return row;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const vault = await getCurrentVault();
  return vault?.profile ?? null;
}

export async function getCurrentVault(): Promise<UserVault | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [
    { data: profile },
    { data: education },
    { data: skills },
    { data: projects },
    { data: experiences },
    { data: certificates },
    { data: achievements },
    { data: proof_links },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("education").select("*").eq("user_id", user.id),
    supabase.from("skills").select("*").eq("user_id", user.id),
    supabase.from("projects").select("*").eq("user_id", user.id),
    supabase.from("experiences").select("*").eq("user_id", user.id),
    supabase.from("certificates").select("*").eq("user_id", user.id),
    supabase.from("achievements").select("*").eq("user_id", user.id),
    supabase.from("proof_links").select("*").eq("user_id", user.id),
  ]);

  const fallback = emptyVault(user);
  return {
    profile: { ...fallback.profile, ...(profile ?? {}) } as Profile,
    education: (education ?? []) as UserVault["education"],
    skills: (skills ?? []) as UserVault["skills"],
    projects: (projects ?? []) as UserVault["projects"],
    experiences: (experiences ?? []) as UserVault["experiences"],
    certificates: (certificates ?? []) as UserVault["certificates"],
    achievements: (achievements ?? []) as UserVault["achievements"],
    proof_links: (proof_links ?? []) as UserVault["proof_links"],
  };
}

export async function saveCurrentVault(vault: UserVault): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from("profiles").upsert(profileForUpsert(vault, user));

  const lists = ["education", "skills", "projects", "experiences", "certificates", "achievements", "proof_links"] as const;
  for (const list of lists) {
    await supabase.from(list).delete().eq("user_id", user.id);
    if (vault[list].length > 0) {
      await supabase.from(list).insert(vault[list].map((item) => listRowForSupabase(item as unknown as Record<string, unknown>, user.id)));
    }
  }
}

export async function getJobs(): Promise<Job[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return (data ?? []) as Job[];
}

export async function getJob(id: string): Promise<Job | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase.from("jobs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  return (data as Job | null) ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  const user = await getCurrentUser();
  if (!user) return job;

  const { data } = await supabase.from("jobs").upsert({ ...job, user_id: user.id }).select().single();
  return (data as Job | null) ?? job;
}

export async function deleteJob(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("jobs").delete().eq("id", id).eq("user_id", user.id);
}

export async function getResumes(): Promise<Resume[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase.from("resumes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return (data ?? []) as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase.from("resumes").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  return (data as Resume | null) ?? null;
}

export async function saveResume(resume: Resume): Promise<Resume> {
  const user = await getCurrentUser();
  if (!user) return resume;

  const { data } = await supabase.from("resumes").upsert({ ...resume, user_id: user.id }).select().single();
  return (data as Resume | null) ?? resume;
}

export async function deleteResume(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await fetch("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as { order?: Order; error?: string };
  if (!response.ok || !data.order) throw new Error(data.error || "Unable to create order.");
  return data.order;
}

export async function getOrders(): Promise<Order[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const email = user.email ?? "";
  const query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  const { data } = email
    ? await query.or(`user_id.eq.${user.id},email.eq.${email}`)
    : await query.eq("user_id", user.id);

  return (data ?? []) as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const orders = await getOrders();
  return orders.find((order) => order.id === id) ?? null;
}

export async function submitPaymentProof(input: PaymentProofInput): Promise<Order | null> {
  const response = await fetch("/api/orders/submit-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Unable to submit payment proof.");

  return getOrder(input.order_id);
}

export async function saveLead(lead: Lead): Promise<Lead> {
  const response = await fetch("/api/leads/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  const data = (await response.json()) as { lead?: Lead; error?: string };
  if (!response.ok || !data.lead) throw new Error(data.error || "Unable to save lead.");
  return data.lead;
}

export async function getLeads(): Promise<Lead[]> {
  return getAdminLeads();
}

export async function getAdminOrders(): Promise<Order[]> {
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Order[];
}

export async function approveAdminOrder(orderId: string): Promise<boolean> {
  const response = await fetch("/api/admin/orders/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  return response.ok;
}

export async function rejectAdminOrder(orderId: string, reason?: string): Promise<boolean> {
  const response = await fetch("/api/admin/orders/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, reason }),
  });
  return response.ok;
}

export async function getAdminLeads(): Promise<Lead[]> {
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Lead[];
}

export async function updateAdminLeadStatus(leadId: string, status: NonNullable<Lead["status"]>): Promise<Lead | null> {
  const response = await fetch("/api/admin/leads/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId, status }),
  });
  const data = (await response.json()) as { lead?: Lead };
  return data.lead ?? null;
}

export async function getAdminUsers(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  return (data ?? []) as Profile[];
}

export async function updateAdminUserPlan(userId: string, plan: Profile["plan"] = "free"): Promise<boolean> {
  const response = await fetch("/api/admin/users/update-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, plan }),
  });
  return response.ok;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
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

export async function getAdminEvents(): Promise<AdminEvent[]> {
  const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(1000);
  return (data ?? []) as AdminEvent[];
}

export async function getAdminTestimonials(): Promise<Testimonial[]> {
  const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Testimonial[];
}

export async function saveAdminTestimonial(testimonial: Omit<Testimonial, "id"> & { id?: string }): Promise<Testimonial> {
  const { data, error } = await supabase.from("testimonials").upsert(testimonial).select().single();
  if (error) throw new Error(error.message);
  return data as Testimonial;
}

export async function deleteAdminTestimonial(id: string): Promise<void> {
  await supabase.from("testimonials").delete().eq("id", id);
}

export async function savePortfolioSettings(public_slug: string, portfolio_public: boolean): Promise<void> {
  const vault = await getCurrentVault();
  if (!vault) return;
  await saveCurrentVault({ ...vault, profile: { ...vault.profile, public_slug, portfolio_public } });
}
