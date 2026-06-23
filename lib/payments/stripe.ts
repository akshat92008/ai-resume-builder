import type { Order } from "../types";
import { createManualOrder } from "./manual";

export async function createStripeOrder(input: {
  email: string;
  plan: string;
  amount_inr: number;
  metadata?: Record<string, unknown>;
}): Promise<Order> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return createManualOrder({ ...input, metadata: { ...input.metadata, fallbackFrom: "stripe" } });
  }

  return {
    ...createManualOrder(input),
    provider: "stripe",
    checkout_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/billing?gateway=stripe&status=stub`,
    metadata: { ...input.metadata, gateway: "stripe", note: "Wire Stripe Checkout here when product prices are created." },
  };
}
