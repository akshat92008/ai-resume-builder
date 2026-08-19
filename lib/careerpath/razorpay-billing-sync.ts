import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RazorpaySubscriptionSnapshot } from "./razorpay-state";

export async function persistRazorpaySubscriptionState(input: {
  eventId: string;
  eventType: string;
  eventCreated: number;
  userId: string | null;
  snapshot: RazorpaySubscriptionSnapshot;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Billing persistence is unavailable.");

  const { data, error } = await supabase.rpc("apply_razorpay_subscription_event", {
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_event_created: input.eventCreated,
    p_user_id: input.userId,
    p_customer_id: input.snapshot.customerId,
    p_subscription_id: input.snapshot.subscriptionId,
    p_provider_status: input.snapshot.providerStatus,
    p_status: input.snapshot.status,
    p_current_period_end: input.snapshot.periodEnd,
    p_cancel_at_period_end: input.snapshot.cancelAtPeriodEnd,
  });

  if (error) throw new Error(`Razorpay event persistence failed: ${error.message}`);
  return String(data || "applied") as "applied" | "stale" | "duplicate";
}

export function razorpayReconciliationEventId(prefix: string, snapshot: RazorpaySubscriptionSnapshot) {
  return [
    prefix,
    snapshot.subscriptionId,
    snapshot.providerStatus,
    snapshot.periodEnd || "none",
    snapshot.cancelAtPeriodEnd ? "cancel" : "renew",
  ].join(":");
}
