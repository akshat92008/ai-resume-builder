import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const requireAuthE2E = process.env.REQUIRE_AUTH_E2E === "true";

if (requireAuthE2E && (!email || !password)) {
  throw new Error("REQUIRE_AUTH_E2E=true but E2E_EMAIL/E2E_PASSWORD are not configured.");
}

test.describe("authenticated CareerOS release flow", () => {
  test.skip(!email || !password, "Authenticated release credentials are not configured.");

  test("login reaches the persisted workspace", async ({ page }) => {
    await page.goto("/login?next=/app");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /login/i }).click();

    await page.waitForURL(/\/app(?:$|\?)/, { timeout: 30_000 });

    const state = await page.request.get("/api/app-state");
    expect(state.status()).toBe(200);
    const payload = await state.json();
    expect(payload).toHaveProperty("workspace");
  });
});
