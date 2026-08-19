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
      appInfo: { name: "CareerOS", version: "1.0.0" },
    });
  }
  return stripeClient;
}

export type SubscriptionPlan = "free" | "pro";
export type UserSubscriptionState = {
  plan: SubscriptionPlan;
  isPro: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
};

const FREE_SUBSCRIPTION: UserSubscriptionState = {
  plan: "free",
  isPro: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasBillingAccount: false,
};

export async function getUserSubscription(): Promise<UserSubscriptionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return FREE_SUBSCRIPTION;

  const user = await getSupabaseUser();
  if (!user) return FREE_SUBSCRIPTION;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return FREE_SUBSCRIPTION;

  const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
  const validPeriod = Boolean(currentPeriodEnd && Number.isFinite(currentPeriodEnd.getTime()) && currentPeriodEnd > new Date());
  const isPro = data.status === "pro" && validPeriod;
  return {
    plan: isPro ? "pro" : "free",
    isPro,
    currentPeriodEnd: currentPeriodEnd && Number.isFinite(currentPeriodEnd.getTime()) ? currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    hasBillingAccount: Boolean(data.stripe_customer_id),
  };
}
