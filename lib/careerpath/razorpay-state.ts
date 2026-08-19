import type { RazorpaySubscription } from "./razorpay";

export type BillingPlan = "free" | "pro";

export type RazorpaySubscriptionSnapshot = {
  customerId: string | null;
  subscriptionId: string;
  providerStatus: RazorpaySubscription["status"];
  status: BillingPlan;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function razorpayStatusToPlan(status: RazorpaySubscription["status"]): BillingPlan {
  return status === "active" ? "pro" : "free";
}

export function razorpayPeriodEndIso(subscription: RazorpaySubscription): string | null {
  const value = subscription.current_end;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

export function razorpaySubscriptionSnapshot(subscription: RazorpaySubscription): RazorpaySubscriptionSnapshot {
  return {
    customerId: subscription.customer_id || null,
    subscriptionId: subscription.id,
    providerStatus: subscription.status,
    status: razorpayStatusToPlan(subscription.status),
    periodEnd: razorpayPeriodEndIso(subscription),
    cancelAtPeriodEnd: Boolean(subscription.has_scheduled_changes && subscription.change_scheduled_at),
  };
}
