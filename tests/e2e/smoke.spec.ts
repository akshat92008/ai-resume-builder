import { test, expect } from "@playwright/test";

test.describe("CareerOS public launch smoke", () => {
  test("landing page communicates the product and truthful-AI boundary", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /Tailor every application\. Never invent experience/i })).toBeVisible();
    await expect(page.getByText(/Truthful AI resume \+ job search system/i).first()).toBeVisible();
    await expect(page.getByText(/CareerOS application engine/i).first()).toBeVisible();
    await expect(page.getByText(/Unsupported claims blocked/i).first()).toBeVisible();
    await expect(page.getByText(/checked against stored evidence before verified output is persisted/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Five moves\. One application system/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Build my resume free/i }).first()).toBeVisible();
  });

  test("production security headers are present on public pages", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["permissions-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });

  test("login route renders CareerOS authentication UI", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
  });

  test("signup route renders verified-email onboarding", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { name: /Build your career operating system/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create free account/i })).toBeVisible();
    await expect(page.getByText(/Create your account, verify your email/i)).toBeVisible();
    await expect(page.getByText(/No inbox detour during the controlled beta/i)).toHaveCount(0);
  });

  test("legal pages are reachable from the public site", async ({ page }) => {
    await page.goto("/");

    const privacy = page.getByRole("link", { name: "Privacy" });
    await expect(privacy).toBeVisible();
    await privacy.click();
    await expect(page).toHaveURL(/\/privacy$/);

    await page.goto("/");
    const terms = page.getByRole("link", { name: "Terms" });
    await expect(terms).toBeVisible();
    await terms.click();
    await expect(page).toHaveURL(/\/terms$/);
  });
});

test.describe("CareerOS landing resilience", () => {
  test.use({ javaScriptEnabled: false });

  test("hero and primary CTA stay visible without hydration", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: /Tailor every application\. Never invent experience/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Build my resume free/i }).first()).toBeVisible();
    await expect(page.getByText(/Claims checked against evidence/i)).toBeVisible();
  });
});
