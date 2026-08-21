import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const loginPage = readFileSync(join(root, "app/login/page.tsx"), "utf8");
const coreFlow = readFileSync(join(root, "tests/e2e/core-flow.spec.ts"), "utf8");

describe("authenticated release login contract", () => {
  it("targets the actual production submit label", () => {
    expect(loginPage).toContain('loading ? "Opening CareerOS..." : <>Sign in');
    expect(coreFlow).toContain('getByRole("button", { name: /sign in/i })');
    expect(coreFlow).not.toContain('getByRole("button", { name: /login/i })');
  });

  it("allows production round trips without weakening the real-AI budget", () => {
    expect(coreFlow).toContain('test.describe.configure({ mode: "serial", timeout: 120_000 })');
    expect(coreFlow).toContain("test.setTimeout(360_000)");
  });
});
