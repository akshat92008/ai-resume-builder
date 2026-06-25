import type { Order } from "../types";
import { createEntityId } from "../utils/ids";

export function createManualOrder(input: {
  email: string;
  plan: string;
  amount_inr: number;
  metadata?: Record<string, unknown>;
}): Order {
  return {
    id: createEntityId(),
    email: input.email,
    plan: input.plan,
    amount_inr: input.amount_inr,
    currency: "INR",
    provider: "manual",
    status: "pending",
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  };
}

export function getManualPaymentInstructions() {
  return {
    upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "",
    qrImageUrl: process.env.NEXT_PUBLIC_UPI_QR_IMAGE_URL ?? "",
    whatsapp: process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP ?? "",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@amauralabs.com",
  };
}
