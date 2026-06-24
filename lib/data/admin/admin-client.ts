import { isSupabaseMode } from "../client/mode";
import * as demo from "../client/demo-storage";
import type { Lead, Order, Profile, Testimonial } from "../../types";

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

export async function saveAdminTestimonial(testimonial: Omit<Testimonial, "id"> & { id?: string }): Promise<Testimonial> {
  if (!isSupabaseMode()) return demo.saveAdminTestimonial(testimonial);
  const response = await fetch("/api/admin/testimonials/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testimonial),
  });
  if (!response.ok) {
    throw new Error("Failed to save testimonial");
  }
  const data = await response.json();
  return data.testimonial;
}

export async function deleteAdminTestimonial(id: string): Promise<void> {
  if (!isSupabaseMode()) return demo.deleteAdminTestimonial(id);
  const response = await fetch("/api/admin/testimonials/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error("Failed to delete testimonial");
  }
}
