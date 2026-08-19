import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const requirePaidE2E = process.env.REQUIRE_PAID_E2E === "true";

if (requirePaidE2E && (!email || !password)) {
  throw new Error("REQUIRE_PAID_E2E=true but E2E_EMAIL/E2E_PASSWORD are not configured.");
}

test.describe("paid CareerOS release flow", () => {
  test.skip(!email || !password, "Paid release credentials are not configured.");

  test("a Razorpay-paid account receives Pro entitlements", async ({ page }) => {
    await page.goto("/login?next=/settings");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /login/i }).click();
    await page.waitForURL(/\/settings(?:$|\?)/, { timeout: 30_000 });

    const subscriptionResponse = await page.request.get("/api/subscription");
    expect(subscriptionResponse.status()).toBe(200);
    const subscription = await subscriptionResponse.json();
    expect(subscription.billingConfigured).toBe(true);
    expect(subscription.billingProvider).toBe("razorpay");
    expect(subscription.plan).toBe("pro");
    expect(subscription.isPro).toBe(true);
    expect(subscription.providerStatus).toBe("active");
    expect(subscription.aiActionsPerDay).toBeGreaterThan(3);
    expect(subscription.tailoringPerDay).toBeGreaterThan(1);
    expect(subscription.outreachPerDay).toBeGreaterThan(1);

    await expect(page.getByText(/Recurring billing is managed securely by Razorpay/i)).toBeVisible();
  });
});
