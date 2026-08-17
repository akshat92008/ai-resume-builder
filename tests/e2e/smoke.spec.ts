import { test, expect } from "@playwright/test";

test.describe("CareerOS public launch smoke", () => {
  test("landing page communicates the free beta and core outcome", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Stop guessing which jobs are worth your time/i })).toBeVisible();
    await expect(page.getByText(/Free beta/i).first()).toBeVisible();
    await expect(page.getByText(/does not invent skills, experience, or achievements/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Try the free beta/i })).toBeVisible();
  });

  test("login route renders CareerOS authentication UI", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Login to CareerOS" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
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
