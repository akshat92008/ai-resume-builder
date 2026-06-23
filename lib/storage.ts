import { mockVault } from "./mock-data";
import type { Job, Lead, Order, Resume, Testimonial, UserVault } from "./types";

const prefix = "careerproof:";

export const storageKeys = {
  vault: `${prefix}vault`,
  jobs: `${prefix}jobs`,
  resumes: `${prefix}resumes`,
  leads: `${prefix}leads`,
  orders: `${prefix}orders`,
  events: `${prefix}events`,
  testimonials: `${prefix}testimonials`,
  referralCode: `${prefix}referralCode`,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function makeId(prefixValue: string) {
  return `${prefixValue}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function readLocal<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (!isBrowser()) return value;
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function getDemoVault() {
  return readLocal<UserVault>(storageKeys.vault, mockVault);
}

export function saveDemoVault(vault: UserVault) {
  return writeLocal(storageKeys.vault, vault);
}

export function getDemoJobs() {
  return readLocal<Job[]>(storageKeys.jobs, []);
}

export function saveDemoJobs(jobs: Job[]) {
  return writeLocal(storageKeys.jobs, jobs);
}

export function upsertDemoJob(job: Job) {
  const jobs = getDemoJobs();
  const next = [job, ...jobs.filter((item) => item.id !== job.id)];
  saveDemoJobs(next);
  return job;
}

export function getDemoResumes() {
  return readLocal<Resume[]>(storageKeys.resumes, []);
}

export function saveDemoResumes(resumes: Resume[]) {
  return writeLocal(storageKeys.resumes, resumes);
}

export function upsertDemoResume(resume: Resume) {
  const resumes = getDemoResumes();
  const next = [resume, ...resumes.filter((item) => item.id !== resume.id)];
  saveDemoResumes(next);
  return resume;
}

export function getDemoLeads() {
  return readLocal<Lead[]>(storageKeys.leads, []);
}

export function saveDemoLead(lead: Lead) {
  const next = [{ ...lead, id: lead.id ?? makeId("lead"), created_at: lead.created_at ?? new Date().toISOString() }, ...getDemoLeads()];
  writeLocal(storageKeys.leads, next);
  return next[0];
}

export function getDemoOrders() {
  return readLocal<Order[]>(storageKeys.orders, []);
}

export function saveDemoOrders(orders: Order[]) {
  return writeLocal(storageKeys.orders, orders);
}

export function upsertDemoOrder(order: Order) {
  const orders = getDemoOrders();
  const next = [order, ...orders.filter((item) => item.id !== order.id)];
  saveDemoOrders(next);
  return order;
}

export type DemoEvent = {
  id: string;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function getDemoEvents() {
  return readLocal<DemoEvent[]>(storageKeys.events, []);
}

export function saveDemoEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  const event: DemoEvent = {
    id: makeId("event"),
    event_name: eventName,
    metadata,
    created_at: new Date().toISOString(),
  };
  writeLocal(storageKeys.events, [event, ...getDemoEvents()]);
  return event;
}

export const demoTestimonials: Testimonial[] = [
  {
    id: "demo-testimonial-1",
    name: "Demo student",
    role: "BCA final year student",
    college: "Example College",
    quote: "Demo testimonial: replace this with a real student quote after launch.",
    rating: 5,
    public: true,
    demo: true,
  },
  {
    id: "demo-testimonial-2",
    name: "Demo placement lead",
    role: "Training and placement coordinator",
    college: "Example Institute",
    quote: "Demo testimonial: CareerProof-style reports can help placement teams spot proof gaps quickly.",
    rating: 5,
    public: true,
    demo: true,
  },
];

export function getDemoTestimonials() {
  return readLocal<Testimonial[]>(storageKeys.testimonials, demoTestimonials);
}

export function saveDemoTestimonials(testimonials: Testimonial[]) {
  return writeLocal(storageKeys.testimonials, testimonials);
}
