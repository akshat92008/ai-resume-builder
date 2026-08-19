import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionSnapshot } from "./billing-state";

export async function persistStripeSubscriptionState(input: {
  eventId: string;
  eventType: string;
  eventCreated: number;
  userId: string | null;
  snapshot: SubscriptionSnapshot;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Billing persistence is unavailable.");

  const { data, error } = await supabase.rpc("apply_stripe_subscription_event", {
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_event_created: input.eventCreated,
    p_user_id: input.userId,
    p_customer_id: input.snapshot.customerId,
    p_subscription_id: input.snapshot.subscriptionId,
    p_status: input.snapshot.status,
    p_current_period_end: input.snapshot.periodEnd,
    p_cancel_at_period_end: input.snapshot.cancelAtPeriodEnd,
  });

  if (error) throw new Error(`Stripe event persistence failed: ${error.message}`);
  return String(data || "applied") as "applied" | "stale" | "duplicate";
}

export function reconciliationEventId(sessionId: string, snapshot: SubscriptionSnapshot) {
  return [
    "checkout-reconcile",
    sessionId,
    snapshot.subscriptionId,
    snapshot.status,
    snapshot.periodEnd || "none",
    snapshot.cancelAtPeriodEnd ? "cancel" : "renew",
  ].join(":");
}
