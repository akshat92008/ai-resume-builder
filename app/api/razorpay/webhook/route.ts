import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  fetchRazorpaySubscription,
  verifyRazorpayWebhookSignature,
  type RazorpaySubscription,
} from "@/lib/careerpath/razorpay";
import { persistRazorpaySubscriptionState } from "@/lib/careerpath/razorpay-billing-sync";
import { razorpaySubscriptionSnapshot } from "@/lib/careerpath/razorpay-state";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: { entity?: RazorpaySubscription };
  };
};

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("[api/razorpay/webhook] Webhook configuration is incomplete");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing Razorpay signature." }, { status: 400 });

  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    logger.warn("[api/razorpay/webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const eventType = event.event || "unknown";
  if (!eventType.startsWith("subscription.")) {
    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const payloadSubscription = event.payload?.subscription?.entity;
  if (!payloadSubscription?.id) {
    return NextResponse.json({ error: "Missing subscription entity." }, { status: 400 });
  }

  const headerEventId = request.headers.get("x-razorpay-event-id");
  const eventId = headerEventId || `body:${createHash("sha256").update(rawBody).digest("hex")}`;
  const eventCreated = Number.isFinite(event.created_at) ? Number(event.created_at) : Math.floor(Date.now() / 1000);

  try {
    // Re-read current provider state so late or same-second webhook delivery cannot
    // overwrite a newer subscription state with a stale payload.
    const subscription = await fetchRazorpaySubscription(payloadSubscription.id);
    if (subscription.plan_id !== process.env.RAZORPAY_PRO_PLAN_ID) {
      throw new Error("Webhook subscription does not match the configured Pro plan.");
    }

    await persistRazorpaySubscriptionState({
      eventId,
      eventType,
      eventCreated,
      userId: null,
      snapshot: razorpaySubscriptionSnapshot(subscription),
    });

    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("[api/razorpay/webhook] Event processing failed", {
      error: error instanceof Error ? error.message : "unknown error",
      eventId,
      eventType,
      subscriptionId: payloadSubscription.id,
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
