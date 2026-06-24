import { makeId } from "@/lib/utils";
import type { Job, Lead, Order, Profile, Resume, Testimonial, UserVault } from "@/lib/types";

// Type definitions to avoid circular dependency
type AuthUser = { id: string; email?: string | null; user_metadata?: { full_name?: string } };
type CreateOrderInput = { email: string; plan: string; amount_inr: number; provider?: Order["provider"]; metadata?: Record<string, unknown> };
type PaymentProofInput = { order_id: string; payment_reference: string; payment_proof_url?: string };

const DEMO_USER_ID = "demo-user-123";

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function defaultDemoVault(): UserVault {
  return {
    profile: {
      id: DEMO_USER_ID,
      full_name: "Demo User",
      email: "demo@example.com",
      phone: "123-456-7890",
      city: "New York",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
      target_roles: ["Software Engineer"],
      headline: "Aspiring Developer",
      summary: "I build things.",
      public_slug: "demo-user",
      portfolio_public: true,
      role: "user",
      plan: "free",
      plan_status: "active",
      pro_until: null,
      referral_code: "DEMO123",
      referred_by: null,
    },
    education: [],
    skills: [],
    projects: [],
    experiences: [],
    certificates: [],
    achievements: [],
    proof_links: [],
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return delay(100, { id: DEMO_USER_ID, email: "demo@example.com", user_metadata: { full_name: "Demo User" } });
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const vault = await getCurrentVault();
  return vault?.profile ?? null;
}

export async function getCurrentVault(): Promise<UserVault | null> {
  return delay(200, getLocal<UserVault>("demo_vault", defaultDemoVault()));
}

export async function saveCurrentVault(vault: UserVault): Promise<void> {
  setLocal("demo_vault", vault);
  await delay(300, undefined);
}

export async function getJobs(): Promise<Job[]> {
  return delay(100, getLocal<Job[]>("demo_jobs", []));
}

export async function getJob(id: string): Promise<Job | null> {
  const jobs = await getJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  const jobs = await getJobs();
  const existingIndex = jobs.findIndex((j) => j.id === job.id);
  const newJob = { ...job, user_id: DEMO_USER_ID, id: job.id || makeId("job") };
  if (existingIndex >= 0) {
    jobs[existingIndex] = newJob;
  } else {
    jobs.unshift(newJob);
  }
  setLocal("demo_jobs", jobs);
  return delay(200, newJob);
}

export async function deleteJob(id: string): Promise<void> {
  const jobs = await getJobs();
  setLocal("demo_jobs", jobs.filter((j) => j.id !== id));
  await delay(100, undefined);
}

export async function getResumes(): Promise<Resume[]> {
  return delay(100, getLocal<Resume[]>("demo_resumes", []));
}

export async function getResume(id: string): Promise<Resume | null> {
  const resumes = await getResumes();
  return resumes.find((r) => r.id === id) ?? null;
}

export async function saveResume(resume: Resume): Promise<Resume> {
  const resumes = await getResumes();
  const existingIndex = resumes.findIndex((r) => r.id === resume.id);
  const newResume = { ...resume, user_id: DEMO_USER_ID, id: resume.id || makeId("resume") };
  if (existingIndex >= 0) {
    resumes[existingIndex] = newResume;
  } else {
    resumes.unshift(newResume);
  }
  setLocal("demo_resumes", resumes);
  return delay(200, newResume);
}

export async function deleteResume(id: string): Promise<void> {
  const resumes = await getResumes();
  setLocal("demo_resumes", resumes.filter((r) => r.id !== id));
  await delay(100, undefined);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const orders = getLocal<Order[]>("demo_orders", []);
  const newOrder: Order = {
    id: `demo-order-${Date.now()}`,
    user_id: DEMO_USER_ID,
    email: input.email,
    plan: input.plan,
    amount_inr: input.amount_inr,
    currency: "INR",
    provider: input.provider || "manual",
    status: "pending",
    metadata: input.metadata || {},
    created_at: new Date().toISOString(),
  };
  orders.unshift(newOrder);
  setLocal("demo_orders", orders);
  return delay(300, newOrder);
}

export async function getOrders(): Promise<Order[]> {
  return delay(100, getLocal<Order[]>("demo_orders", []));
}

export async function getOrder(id: string): Promise<Order | null> {
  const orders = await getOrders();
  return orders.find((o) => o.id === id) ?? null;
}

export async function submitPaymentProof(input: PaymentProofInput): Promise<Order | null> {
  const orders = getLocal<Order[]>("demo_orders", []);
  const index = orders.findIndex((o) => o.id === input.order_id);
  if (index >= 0) {
    orders[index] = {
      ...orders[index],
      payment_reference: input.payment_reference,
      payment_proof_url: input.payment_proof_url,
      status: "pending", // Still pending until admin approves
    };
    setLocal("demo_orders", orders);
    return delay(200, orders[index]);
  }
  throw new Error("Order not found");
}

export async function saveLead(lead: Lead): Promise<Lead> {
  const leads = getLocal<Lead[]>("demo_leads", []);
  const newLead = { ...lead, id: makeId("lead"), status: "new" as const, created_at: new Date().toISOString() };
  leads.unshift(newLead);
  setLocal("demo_leads", leads);
  return delay(200, newLead);
}

export async function getLeads(): Promise<Lead[]> {
  return delay(100, getLocal<Lead[]>("demo_leads", []));
}

export async function getAdminOrders(): Promise<Order[]> {
  return getOrders();
}

export async function approveAdminOrder(orderId: string): Promise<boolean> {
  const orders = getLocal<Order[]>("demo_orders", []);
  const index = orders.findIndex((o) => o.id === orderId);
  if (index >= 0) {
    orders[index] = {
      ...orders[index],
      status: "approved",
      approved_at: new Date().toISOString(),
    };
    setLocal("demo_orders", orders);
    
    // update profile plan too
    const vault = getLocal<UserVault>("demo_vault", defaultDemoVault());
    vault.profile.plan = orders[index].plan as Profile["plan"];
    vault.profile.plan_status = "active";
    setLocal("demo_vault", vault);
    
    return delay(200, true);
  }
  return false;
}

export async function rejectAdminOrder(orderId: string, reason?: string): Promise<boolean> {
  const orders = getLocal<Order[]>("demo_orders", []);
  const index = orders.findIndex((o) => o.id === orderId);
  if (index >= 0) {
    orders[index] = {
      ...orders[index],
      status: "rejected",
      metadata: { ...orders[index].metadata, reject_reason: reason },
    };
    setLocal("demo_orders", orders);
    return delay(200, true);
  }
  return false;
}

export async function getAdminLeads(): Promise<Lead[]> {
  return getLeads();
}

export async function updateAdminLeadStatus(leadId: string, status: NonNullable<Lead["status"]>): Promise<Lead | null> {
  const leads = getLocal<Lead[]>("demo_leads", []);
  const index = leads.findIndex((l) => l.id === leadId);
  if (index >= 0) {
    leads[index].status = status;
    setLocal("demo_leads", leads);
    return delay(100, leads[index]);
  }
  return null;
}

export async function getAdminUsers(): Promise<Profile[]> {
  const profile = await getCurrentProfile();
  return delay(100, profile ? [profile] : []);
}

export async function updateAdminUserPlan(userId: string, plan: Profile["plan"] = "free"): Promise<boolean> {
  const vault = getLocal<UserVault>("demo_vault", defaultDemoVault());
  if (vault.profile.id === userId) {
    vault.profile.plan = plan;
    vault.profile.plan_status = "active";
    setLocal("demo_vault", vault);
    return delay(100, true);
  }
  return false;
}

export async function getAdminMetrics(): Promise<any> {
  const orders = getLocal<Order[]>("demo_orders", []);
  const leads = getLocal<Lead[]>("demo_leads", []);
  const resumes = getLocal<Resume[]>("demo_resumes", []);
  return delay(100, {
    users: 1,
    orders: orders.length,
    leads: leads.length,
    resumes: resumes.length,
    events: 0,
  });
}

export async function getAdminEvents(): Promise<any[]> {
  return delay(100, []);
}

export async function getAdminTestimonials(): Promise<Testimonial[]> {
  return delay(100, getLocal<Testimonial[]>("demo_testimonials", []));
}

export async function saveAdminTestimonial(testimonial: Omit<Testimonial, "id"> & { id?: string }): Promise<Testimonial> {
  const tests = getLocal<Testimonial[]>("demo_testimonials", []);
  const index = tests.findIndex((t) => t.id === testimonial.id);
  const newT = { ...testimonial, id: testimonial.id || makeId("test"), created_at: new Date().toISOString() };
  if (index >= 0) {
    tests[index] = newT;
  } else {
    tests.unshift(newT);
  }
  setLocal("demo_testimonials", tests);
  return delay(100, newT);
}

export async function deleteAdminTestimonial(id: string): Promise<void> {
  const tests = getLocal<Testimonial[]>("demo_testimonials", []);
  setLocal("demo_testimonials", tests.filter((t) => t.id !== id));
  await delay(100, undefined);
}

export async function savePortfolioSettings(public_slug: string, portfolio_public: boolean): Promise<void> {
  const vault = await getCurrentVault();
  if (!vault) return;
  await saveCurrentVault({ ...vault, profile: { ...vault.profile, public_slug, portfolio_public } });
}
