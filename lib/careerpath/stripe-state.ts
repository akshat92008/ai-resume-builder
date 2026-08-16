export type BillingPlan = "free" | "pro";

export function stripeSubscriptionStatusToPlan(status: string): BillingPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

export function stripePeriodEndIso(subscription: {
  items?: { data?: Array<{ current_period_end?: number | null }> };
}): string | null {
  const periodEnds = (subscription.items?.data || [])
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!periodEnds.length) return null;
  return new Date(Math.min(...periodEnds) * 1000).toISOString();
}
