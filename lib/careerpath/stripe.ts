/** CareerOS — Stripe integration and subscription lookup. */
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "./db";
import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured for this deployment.");
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-06-24.dahlia",
      appInfo: { name: "CareerPath AI", version: "1.0.0" },
    });
  }
  return stripeClient;
}

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
    .maybeSingle();

  if (error || !data) return { plan: "free", isPro: false };

  const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
  const isPro = data.status === "pro" && Boolean(currentPeriodEnd && currentPeriodEnd > new Date());
  return { plan: isPro ? "pro" : "free", isPro };
}
