import { test, expect } from "@playwright/test";

test.describe("@public CareerOS public release smoke", () => {
  test("landing, pricing, privacy and login surfaces render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Apply where you fit/i })).toBeVisible();
    await expect(page.getByText("$15 / month")).toBeVisible();
    await expect(page.getByText(/One job-search journey/i)).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText(/NVIDIA NIM/i)).toBeVisible();
    await expect(page.getByText(/We do not sell your career data/i)).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Login to CareerPath AI/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("security-sensitive health response is non-cacheable", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    expect(response.headers()["cache-control"]).toMatch(/no-store/i);
  });
});
