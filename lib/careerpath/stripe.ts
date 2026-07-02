/**
 * CareerOS — Stripe Integration
 *
 * Handles subscription checks, Stripe Checkout sessions, and Webhooks.
 */

import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "./db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", // Adjust to your preferred API version
  appInfo: {
    name: "CareerPath AI",
    version: "1.0.0",
  },
});

export type SubscriptionPlan = "free" | "pro";

export async function getUserSubscription(): Promise<{ plan: SubscriptionPlan; isPro: boolean }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { plan: "free", isPro: false };

  const user = await getSupabaseUser();
  if (!user) return { plan: "free", isPro: false };

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return { plan: "free", isPro: false };

  const isPro = data.status === "pro" && new Date(data.current_period_end) > new Date();
  
  return {
    plan: isPro ? "pro" : "free",
    isPro,
  };
}
