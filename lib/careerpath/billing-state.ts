import type Stripe from "stripe";
import { stripePeriodEndIso, stripeSubscriptionStatusToPlan } from "./stripe-state";

export type SubscriptionSnapshot = {
  customerId: string;
  subscriptionId: string;
  status: "free" | "pro";
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function subscriptionSnapshot(subscription: Stripe.Subscription): SubscriptionSnapshot {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  return {
    customerId,
    subscriptionId: subscription.id,
    status: stripeSubscriptionStatusToPlan(subscription.status),
    periodEnd: stripePeriodEndIso(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export function checkoutSessionUserId(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.userId || session.client_reference_id || null;
}

export function checkoutSessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  return typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
}

export function checkoutSessionCustomerId(session: Stripe.Checkout.Session): string | null {
  return typeof session.customer === "string" ? session.customer : session.customer?.id || null;
}
