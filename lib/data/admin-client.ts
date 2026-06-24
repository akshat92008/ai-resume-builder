import { isSupabaseMode } from "./mode";
import * as demo from "./demo-storage";
import type { Lead, Order, Profile, Testimonial } from "../types";

export async function approveAdminOrder(orderId: string): Promise<boolean> {
  if (!isSupabaseMode()) return demo.approveAdminOrder(orderId);
  const response = await fetch("/api/admin/orders/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  return response.ok;
}

export async function rejectAdminOrder(orderId: string, reason?: string): Promise<boolean> {
  if (!isSupabaseMode()) return demo.rejectAdminOrder(orderId, reason);
  const response = await fetch("/api/admin/orders/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, reason }),
  });
  return response.ok;
}

export async function updateAdminLeadStatus(leadId: string, status: NonNullable<Lead["status"]>): Promise<Lead | null> {
  if (!isSupabaseMode()) return demo.updateAdminLeadStatus(leadId, status);
  const response = await fetch("/api/admin/leads/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId, status }),
  });
  const data = await response.json();
  return data.lead ?? null;
}

export async function updateAdminUserPlan(userId: string, plan: Profile["plan"] = "free"): Promise<boolean> {
  if (!isSupabaseMode()) return demo.updateAdminUserPlan(userId, plan);
  const response = await fetch("/api/admin/users/update-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, plan }),
  });
  return response.ok;
}

// Testimonials data fetching is moved to server component, but mutations stay here
export async function saveAdminTestimonial(testimonial: Omit<Testimonial, "id"> & { id?: string }): Promise<Testimonial> {
  if (!isSupabaseMode()) return demo.saveAdminTestimonial(testimonial);
  // Need to handle Supabase server action or API route. Wait, saveAdminTestimonial is used by client component. 
  // We can import server action here? Next.js might complain if this is imported from a Client Component.
  // Actually, we can just pass the server action as a prop! Or create an API route. 
  // Let's create an API route or just put 'use server' inside the action and call it.
  // If we just use fetch, we need an API route. There isn't one for saving testimonials right now.
  // But wait, the existing code: return saveAdminTestimonialServer(testimonial);
  // Let's do a dynamic import to avoid module level 'use server' contamination
  const { saveAdminTestimonialServer } = await import("./admin-actions");
  return saveAdminTestimonialServer(testimonial);
}

export async function deleteAdminTestimonial(id: string): Promise<void> {
  if (!isSupabaseMode()) return demo.deleteAdminTestimonial(id);
  const { deleteAdminTestimonialServer } = await import("./admin-actions");
  return deleteAdminTestimonialServer(id);
}
