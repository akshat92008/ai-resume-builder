import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  checkoutSessionCustomerId,
  checkoutSessionSubscriptionId,
  checkoutSessionUserId,
  subscriptionSnapshot,
} from "@/lib/careerpath/billing-state";
import { reconciliationEventId } from "@/lib/careerpath/billing-sync";

function session(input: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return input as Stripe.Checkout.Session;
}

function subscription(input: Partial<Stripe.Subscription>): Stripe.Subscription {
  return input as Stripe.Subscription;
}

describe("paid billing state", () => {
  it("binds checkout confirmation to the authenticated application user", () => {
    const value = session({
      client_reference_id: "user-123",
      metadata: { userId: "user-123" },
      subscription: "sub_123",
      customer: "cus_123",
    });
    expect(checkoutSessionUserId(value)).toBe("user-123");
    expect(checkoutSessionSubscriptionId(value)).toBe("sub_123");
    expect(checkoutSessionCustomerId(value)).toBe("cus_123");
  });

  it("prefers signed checkout metadata over the fallback reference", () => {
    expect(checkoutSessionUserId(session({ metadata: { userId: "owner" }, client_reference_id: "fallback" }))).toBe("owner");
  });

  it("maps active Stripe state to a deterministic Pro snapshot", () => {
    const value = subscription({
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 2_000_000_000 }] } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });
    const snapshot = subscriptionSnapshot(value);
    expect(snapshot.status).toBe("pro");
    expect(snapshot.customerId).toBe("cus_123");
    expect(snapshot.periodEnd).toBe(new Date(2_000_000_000 * 1000).toISOString());
    expect(reconciliationEventId("cs_123", snapshot)).toContain("sub_123:pro");
  });

  it("revokes Pro for payment-problem subscription states", () => {
    const value = subscription({
      id: "sub_456",
      status: "past_due",
      customer: "cus_456",
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 2_000_000_000 }] } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });
    expect(subscriptionSnapshot(value).status).toBe("free");
  });
});
