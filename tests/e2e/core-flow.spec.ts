import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const userBEmail = process.env.E2E_USER_B_EMAIL;
const userBPassword = process.env.E2E_USER_B_PASSWORD;
const requireAuthE2E = process.env.REQUIRE_AUTH_E2E === "true";
const runRealAiE2E = process.env.RUN_REAL_AI_E2E === "true";

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

async function pollOperation(request: APIRequestContext, operationId: string, resumeId?: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const params = new URLSearchParams({ operationId });
    if (resumeId) params.set("resumeId", resumeId);
    const response = await request.get(`/api/resume-agent/status?${params.toString()}`);
    expect(response.status()).toBe(200);
    const payload = await response.json();
    if (payload.done) return payload;
    await new Promise((resolve) => setTimeout(resolve, attempt < 5 ? 1_500 : 2_500));
  }
  throw new Error(`CareerOS operation ${operationId} did not complete within the release timeout.`);
}

function stringifyResumeContent(value: unknown) {
  return JSON.stringify(value).toLowerCase();
}

test.describe("authenticated CareerOS release flow", () => {
  test.describe.configure({ mode: "serial" });
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

    await contextA.close();
    const refreshedContextA = await browser.newContext();
    const refreshedPageA = await login(refreshedContextA, email!, password!);
    const persisted = await refreshedPageA.request.get(`/api/jobs/${jobId}`);
    expect(persisted.status()).toBe(200);
    const persistedPayload = await persisted.json();
    expect(persistedPayload.job.status).toBe("applied");
    expect(persistedPayload.job.stage).toBe("screening");

    const contextB = await browser.newContext();
    const pageB = await login(contextB, userBEmail!, userBPassword!);
    expect((await pageB.request.get(`/api/jobs/${jobId}`)).status()).toBe(404);
    expect((await pageB.request.patch(`/api/jobs/${jobId}`, { data: { status: "offer" } })).status()).toBe(404);
    expect((await pageB.request.delete(`/api/jobs/${jobId}`)).status()).toBe(404);

    const userBState = await pageB.request.get("/api/app-state");
    expect(userBState.status()).toBe(200);
    expect(JSON.stringify(await userBState.json())).not.toContain(marker);

    const afterIsolation = await refreshedPageA.request.get(`/api/jobs/${jobId}`);
    expect(afterIsolation.status()).toBe(200);
    expect((await afterIsolation.json()).job.status).toBe("applied");

    const cleanup = await refreshedPageA.request.delete(`/api/jobs/${jobId}`);
    expect(cleanup.status()).toBe(200);

    await contextB.close();
    await refreshedContextA.close();
  });

  test("real Career Memory → Inngest AI → verified improve/tailor → PDF with exact operation isolation", async ({ browser }) => {
    test.skip(!runRealAiE2E, "Set RUN_REAL_AI_E2E=true only for the deployed release gate.");
    test.setTimeout(210_000);

    const contextA = await browser.newContext();
    const pageA = await login(contextA, email!, password!);
    const marker = `ai-release-${Date.now()}`;

    const createAgent = await pageA.request.post("/api/resume-agent", {
      data: {
        message: `Build a resume from these facts only. My name is Release Candidate ${marker}. I am targeting Software Engineer roles. I worked at Example Labs as a Software Engineering Intern from 2025 to 2026. I built an inventory dashboard using React, TypeScript, Next.js and PostgreSQL, implemented REST APIs, and wrote 120 automated tests. My project is named Inventory Dashboard. My skills are React, TypeScript, Next.js and PostgreSQL. Do not add claims that are not supported by these facts.`,
      },
    });
    expect(createAgent.status()).toBe(200);
    const queued = await createAgent.json();
    expect(queued.status).toBe("queued");
    expect(queued.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(queued.jobId).toBeTruthy();

    const completed = await pollOperation(pageA.request, queued.operationId);
    expect(completed.done).toBe(true);
    expect(completed.latestAssistant?.content).toBeTruthy();
    const resumeId = completed.resumeId as string;
    expect(resumeId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(completed.resume?.careerProfile).toBeTruthy();
    expect(stringifyResumeContent(completed.resume?.content)).toContain("react");
    expect(stringifyResumeContent(completed.resume?.content)).toContain("120");

    // Operation correlation is tenant-bound: User B cannot discover User A's completion.
    const contextB = await browser.newContext();
    const pageB = await login(contextB, userBEmail!, userBPassword!);
    const userBStatus = await pageB.request.get(`/api/resume-agent/status?operationId=${queued.operationId}&resumeId=${resumeId}`);
    expect(userBStatus.status()).toBe(200);
    expect((await userBStatus.json()).done).toBe(false);
    expect((await pageB.request.get(`/api/resume/${resumeId}`)).status()).toBe(404);
    expect((await pageB.request.patch(`/api/resume/${resumeId}`, { data: { title: "cross-tenant" } })).status()).toBe(404);
    expect((await pageB.request.delete(`/api/resume/${resumeId}`)).status()).toBe(404);

    // Introduce an explicit user-authored unsupported claim, then prove that the
    // AI improve persistence boundary strips it against durable Career Memory.
    const currentResponse = await pageA.request.get(`/api/resume/${resumeId}`);
    expect(currentResponse.status()).toBe(200);
    const currentPayload = await currentResponse.json();
    const content = structuredClone(currentPayload.resume.content);
    expect(content.experience?.length).toBeGreaterThan(0);
    content.experience[0].bullets = [
      ...(content.experience[0].bullets || []),
      "Increased company revenue by 900% through a global optimization program",
    ];
    const seedUnsupported = await pageA.request.patch(`/api/resume/${resumeId}`, { data: { content } });
    expect(seedUnsupported.status()).toBe(200);
    expect(stringifyResumeContent((await seedUnsupported.json()).resume.content)).toContain("900");

    const improve = await pageA.request.post("/api/resume/improve", { data: { resumeId } });
    expect(improve.status()).toBe(200);
    const improved = await improve.json();
    expect(stringifyResumeContent(improved.content)).not.toContain("900");
    expect(improved.verification).toBeTruthy();

    const tailor = await pageA.request.post("/api/resume/tailor", {
      data: {
        resumeId,
        jobDescription: "Software Engineer role building React and TypeScript web products with Next.js, PostgreSQL, REST APIs and automated testing.",
      },
    });
    expect(tailor.status()).toBe(200);
    const tailored = await tailor.json();
    expect(tailored.newResumeId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(stringifyResumeContent(tailored.tailoredContent)).not.toContain("900");

    const tailoredId = tailored.newResumeId as string;
    const pdf = await pageA.request.get(`/api/resume/${tailoredId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect(Number(pdf.headers()["x-careeros-ats-artifact-score"] || "0")).toBeGreaterThan(0);
    expect((await pdf.body()).byteLength).toBeGreaterThan(500);

    // Two concurrent edits must not both overwrite the same version. Exactly
    // one conditional update wins and one receives the explicit conflict.
    const concurrent = await Promise.all([
      pageA.request.patch(`/api/resume/${tailoredId}`, { data: { title: `Concurrent A ${marker}` } }),
      pageA.request.patch(`/api/resume/${tailoredId}`, { data: { title: `Concurrent B ${marker}` } }),
    ]);
    expect(concurrent.map((response) => response.status()).sort()).toEqual([200, 409]);

    expect((await pageB.request.get(`/api/resume/${tailoredId}`)).status()).toBe(404);

    expect((await pageA.request.delete(`/api/resume/${resumeId}`)).status()).toBe(200);
    expect((await pageA.request.delete(`/api/resume/${tailoredId}`)).status()).toBe(200);
    await contextB.close();
    await contextA.close();
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
