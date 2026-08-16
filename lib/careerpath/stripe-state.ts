export type BillingPlan = "free" | "pro";

export function stripeSubscriptionStatusToPlan(status: string): BillingPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

export function stripePeriodEndIso(subscription: { current_period_end?: number | null }): string | null {
  const periodEnd = subscription.current_period_end;
  return typeof periodEnd === "number" && Number.isFinite(periodEnd)
    ? new Date(periodEnd * 1000).toISOString()
    : null;
}
