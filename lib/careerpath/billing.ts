import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "./db";

export type SubscriptionPlan = "free" | "pro";
export type UserSubscriptionState = {
  plan: SubscriptionPlan;
  isPro: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  providerStatus: string | null;
  subscriptionId: string | null;
};

const FREE_SUBSCRIPTION: UserSubscriptionState = {
  plan: "free",
  isPro: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasBillingAccount: false,
  providerStatus: null,
  subscriptionId: null,
};

export async function getUserSubscription(): Promise<UserSubscriptionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return FREE_SUBSCRIPTION;

  const user = await getSupabaseUser();
  if (!user) return FREE_SUBSCRIPTION;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("status, current_period_end, cancel_at_period_end, razorpay_customer_id, razorpay_subscription_id, razorpay_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return FREE_SUBSCRIPTION;

  const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
  const validPeriod = Boolean(currentPeriodEnd && Number.isFinite(currentPeriodEnd.getTime()) && currentPeriodEnd > new Date());
  const isPro = data.status === "pro" && data.razorpay_status === "active" && validPeriod;
  return {
    plan: isPro ? "pro" : "free",
    isPro,
    currentPeriodEnd: currentPeriodEnd && Number.isFinite(currentPeriodEnd.getTime()) ? currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    hasBillingAccount: Boolean(data.razorpay_customer_id || data.razorpay_subscription_id),
    providerStatus: data.razorpay_status || null,
    subscriptionId: data.razorpay_subscription_id || null,
  };
}
