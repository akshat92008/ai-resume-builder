import type { Order } from "../types";
import { createManualOrder } from "./manual";

export async function createLemonSqueezyOrder(input: {
  email: string;
  plan: string;
  amount_inr: number;
  metadata?: Record<string, unknown>;
}): Promise<Order> {
  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    return createManualOrder({ ...input, metadata: { ...input.metadata, fallbackFrom: "lemonsqueezy" } });
  }

  return {
    ...createManualOrder(input),
    provider: "lemonsqueezy",
    checkout_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/billing?gateway=lemonsqueezy&status=stub`,
    metadata: { ...input.metadata, gateway: "lemonsqueezy", note: "Wire Lemon Squeezy checkout here when variants are configured." },
  };
}
