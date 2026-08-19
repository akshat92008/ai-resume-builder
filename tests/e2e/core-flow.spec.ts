import { test, expect, type BrowserContext } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const userBEmail = process.env.E2E_USER_B_EMAIL;
const userBPassword = process.env.E2E_USER_B_PASSWORD;
const requireAuthE2E = process.env.REQUIRE_AUTH_E2E === "true";

if (requireAuthE2E && (!email || !password || !userBEmail || !userBPassword)) {
  throw new Error("REQUIRE_AUTH_E2E=true requires E2E_EMAIL/E2E_PASSWORD and E2E_USER_B_EMAIL/E2E_USER_B_PASSWORD.");
}

async function login(context: BrowserContext, username: string, secret: string) {
  const page = await context.newPage();
  await page.goto("/login?next=/app");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: /login/i }).click();
  await page.waitForURL(/\/app(?:$|\?)/, { timeout: 30_000 });
  return page;
}

test.describe("authenticated CareerOS release flow", () => {
  test.skip(!email || !password || !userBEmail || !userBPassword, "Authenticated two-user release credentials are not configured.");

  test("memory → job → stage → refresh persistence with cross-tenant isolation", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await login(contextA, email!, password!);
    const marker = `release-${Date.now()}`;

    const state = await pageA.request.get("/api/app-state");
    expect(state.status()).toBe(200);
    expect(await state.json()).toHaveProperty("workspace");

    const memory = await pageA.request.put("/api/memory", {
      data: {
        personal: { fullName: `Release Gate ${marker}` },
        target: { targetRoles: ["Software Engineer"] },
      },
    });
    expect(memory.status()).toBe(200);
    const memoryPayload = await memory.json();
    expect(memoryPayload.success).toBe(true);
    expect(memoryPayload.careerProfile.personal.fullName).toBe(`Release Gate ${marker}`);

    const create = await pageA.request.post("/api/jobs", {
      data: {
        company: `CareerOS Release ${marker}`,
        role: "Software Engineer",
        status: "saved",
        notes: "release-gate",
      },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    const jobId = created.job.id as string;
    expect(jobId).toBeTruthy();

    const update = await pageA.request.patch(`/api/jobs/${jobId}`, {
      data: { status: "applied", stage: "screening", notes: "release-gate-updated" },
    });
    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.job.status).toBe("applied");
    expect(updated.job.stage).toBe("screening");
    expect(updated.job.appliedAt).toBeTruthy();

    // A fresh authenticated browser context proves the state survived request/session refresh.
    await contextA.close();
    const refreshedContextA = await browser.newContext();
    const refreshedPageA = await login(refreshedContextA, email!, password!);
    const persisted = await refreshedPageA.request.get(`/api/jobs/${jobId}`);
    expect(persisted.status()).toBe(200);
    const persistedPayload = await persisted.json();
    expect(persistedPayload.job.status).toBe("applied");
    expect(persistedPayload.job.stage).toBe("screening");

    // User B must neither read nor mutate User A's object. A 404 avoids object-existence disclosure.
    const contextB = await browser.newContext();
    const pageB = await login(contextB, userBEmail!, userBPassword!);
    expect((await pageB.request.get(`/api/jobs/${jobId}`)).status()).toBe(404);
    expect((await pageB.request.patch(`/api/jobs/${jobId}`, { data: { status: "offer" } })).status()).toBe(404);
    expect((await pageB.request.delete(`/api/jobs/${jobId}`)).status()).toBe(404);

    const afterIsolation = await refreshedPageA.request.get(`/api/jobs/${jobId}`);
    expect(afterIsolation.status()).toBe(200);
    expect((await afterIsolation.json()).job.status).toBe("applied");

    const cleanup = await refreshedPageA.request.delete(`/api/jobs/${jobId}`);
    expect(cleanup.status()).toBe(200);

    await contextB.close();
    await refreshedContextA.close();
  });

  test("oversized and unknown mutation input fails closed", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, email!, password!);

    const unknownField = await page.request.post("/api/jobs", {
      data: { company: "Release Gate", role: "Engineer", status: "saved", userId: crypto.randomUUID() },
    });
    expect(unknownField.status()).toBe(400);

    const oversized = await page.request.post("/api/jobs", {
      data: { company: "Release Gate", role: "Engineer", status: "saved", notes: "x".repeat(30_000) },
    });
    expect(oversized.status()).toBe(413);

    await context.close();
  });
});
