import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ORIGINAL_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

afterEach(() => {
  if (ORIGINAL_KEY_SECRET === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = ORIGINAL_KEY_SECRET;
  if (ORIGINAL_WEBHOOK_SECRET === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
  else process.env.RAZORPAY_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
  vi.resetModules();
});

describe("Razorpay signatures", () => {
  it("accepts only the exact payment/subscription signature", async () => {
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret_123456";
    vi.resetModules();
    const { verifyRazorpayPaymentSignature } = await import("@/lib/careerpath/razorpay");
    const paymentId = "pay_release_123";
    const subscriptionId = "sub_release_123";
    const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    expect(verifyRazorpayPaymentSignature({ paymentId, subscriptionId, signature })).toBe(true);
    expect(verifyRazorpayPaymentSignature({ paymentId: "pay_other", subscriptionId, signature })).toBe(false);
  });

  it("verifies the exact raw webhook bytes and rejects altered bytes", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_123456";
    vi.resetModules();
    const { verifyRazorpayWebhookSignature } = await import("@/lib/careerpath/razorpay");
    const raw = new TextEncoder().encode('{"event":"subscription.activated","unicode":"✓"}');
    const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");

    expect(verifyRazorpayWebhookSignature(raw, signature)).toBe(true);
    expect(verifyRazorpayWebhookSignature(new TextEncoder().encode('{"event":"subscription.cancelled"}'), signature)).toBe(false);
  });
});
