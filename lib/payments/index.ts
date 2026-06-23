import type { Order, PaymentProvider } from "../types";
import { createManualOrder } from "./manual";
import { createStripeOrder } from "./stripe";
import { createRazorpayOrder } from "./razorpay";
import { createLemonSqueezyOrder } from "./lemonsqueezy";

export type CreateOrderInput = {
  email: string;
  plan: string;
  amount_inr: number;
  provider?: PaymentProvider;
  metadata?: Record<string, unknown>;
};

export function getConfiguredPaymentMode(): PaymentProvider {
  const configured = process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentProvider | undefined;
  if (configured === "stripe" && process.env.STRIPE_SECRET_KEY) return "stripe";
  if (configured === "razorpay" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  if (configured === "lemonsqueezy" && process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID) return "lemonsqueezy";
  return "manual";
}

export async function createPaymentOrder(input: CreateOrderInput): Promise<Order> {
  const provider = input.provider ?? getConfiguredPaymentMode();
  if (provider === "stripe") return createStripeOrder(input);
  if (provider === "razorpay") return createRazorpayOrder(input);
  if (provider === "lemonsqueezy") return createLemonSqueezyOrder(input);
  return createManualOrder(input);
}
