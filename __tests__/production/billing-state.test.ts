import { describe, expect, it } from "vitest";
import { razorpaySubscriptionSnapshot } from "@/lib/careerpath/razorpay-state";
import { razorpayReconciliationEventId } from "@/lib/careerpath/razorpay-billing-sync";
import type { RazorpaySubscription } from "@/lib/careerpath/razorpay";

function subscription(input: Partial<RazorpaySubscription>): RazorpaySubscription {
  return {
    id: "sub_default",
    entity: "subscription",
    plan_id: "plan_pro",
    status: "created",
    ...input,
  } as RazorpaySubscription;
}

describe("paid billing state", () => {
  it("maps active Razorpay state to a deterministic Pro snapshot", () => {
    const snapshot = razorpaySubscriptionSnapshot(subscription({
      id: "sub_123",
      status: "active",
      customer_id: "cust_123",
      current_end: 2_000_000_000,
    }));
    expect(snapshot.status).toBe("pro");
    expect(snapshot.customerId).toBe("cust_123");
    expect(snapshot.periodEnd).toBe(new Date(2_000_000_000 * 1000).toISOString());
    expect(razorpayReconciliationEventId("checkout", snapshot)).toContain("sub_123:active");
  });

  it("fails closed before activation and on payment-problem states", () => {
    for (const status of ["created", "authenticated", "pending", "halted", "cancelled", "completed", "expired"] as const) {
      expect(razorpaySubscriptionSnapshot(subscription({ status })).status).toBe("free");
    }
  });

  it("recognizes scheduled cancellation without revoking the current active period", () => {
    const snapshot = razorpaySubscriptionSnapshot(subscription({
      status: "active",
      current_end: 2_000_000_000,
      has_scheduled_changes: true,
      change_scheduled_at: 2_000_000_000,
    }));
    expect(snapshot.status).toBe("pro");
    expect(snapshot.cancelAtPeriodEnd).toBe(true);
  });
});
