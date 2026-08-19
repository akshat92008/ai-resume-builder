import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export type RazorpaySubscription = {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id?: string | null;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  total_count?: number;
  paid_count?: number;
  remaining_count?: number;
  created_at?: number;
  has_scheduled_changes?: boolean;
  change_scheduled_at?: number | null;
  notes?: Record<string, string> | string[];
  short_url?: string | null;
};

function credentials() {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured for this deployment.");
  return { keyId, keySecret };
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const description = payload?.error?.description || payload?.error?.reason || `Razorpay request failed (${response.status})`;
    throw new Error(String(description));
  }
  return payload as T;
}

export async function createRazorpaySubscription(input: { userId: string; email?: string | null }) {
  const planId = env.RAZORPAY_PRO_PLAN_ID;
  const totalCount = Number(env.RAZORPAY_PRO_TOTAL_COUNT);
  if (!planId || !Number.isInteger(totalCount) || totalCount < 1) {
    throw new Error("Razorpay Pro plan configuration is incomplete.");
  }

  return razorpayRequest<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: true,
      notes: {
        careeros_user_id: input.userId,
        ...(input.email ? { careeros_email: input.email.slice(0, 240) } : {}),
      },
    }),
  });
}

export function fetchRazorpaySubscription(subscriptionId: string) {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function cancelRazorpaySubscription(subscriptionId: string, cancelAtCycleEnd = true) {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
  });
}

function safeHexEqual(expected: string, received: string) {
  if (!/^[a-f0-9]+$/i.test(expected) || !/^[a-f0-9]+$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyRazorpayPaymentSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  const secret = env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest("hex");
  return safeHexEqual(expected, input.signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}
