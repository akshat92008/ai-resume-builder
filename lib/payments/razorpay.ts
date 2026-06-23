import type { Order } from "../types";
import { createManualOrder } from "./manual";

export async function createRazorpayOrder(input: {
  email: string;
  plan: string;
  amount_inr: number;
  metadata?: Record<string, unknown>;
}): Promise<Order> {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return createManualOrder({ ...input, metadata: { ...input.metadata, fallbackFrom: "razorpay" } });
  }

  return {
    ...createManualOrder(input),
    provider: "razorpay",
    checkout_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/billing?gateway=razorpay&status=stub`,
    metadata: { ...input.metadata, gateway: "razorpay", note: "Wire Razorpay Orders API here when keys are configured." },
  };
}
