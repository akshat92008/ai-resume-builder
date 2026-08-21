import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github/workflows/core-release.yml"), "utf8");
const releaseUsers = readFileSync(join(root, "scripts/release-users.mjs"), "utf8");
const accountRoute = readFileSync(join(root, "app/api/account/route.ts"), "utf8");

describe("self-contained core release certification", () => {
  it("does not depend on manually maintained authenticated E2E secrets", () => {
    expect(workflow).not.toContain("secrets.E2E_EMAIL");
    expect(workflow).not.toContain("secrets.E2E_PASSWORD");
    expect(workflow).not.toContain("secrets.E2E_USER_B_EMAIL");
    expect(workflow).not.toContain("secrets.E2E_USER_B_PASSWORD");
  });

  it("provisions and always removes two disposable authenticated users", () => {
    expect(workflow).toContain("node scripts/release-users.mjs provision");
    expect(workflow).toContain("node scripts/release-users.mjs cleanup");
    expect(workflow).toContain("Delete ephemeral release accounts");
    expect(workflow).toContain("if: always()");
    expect(releaseUsers).toContain("/api/auth/signup");
    expect(releaseUsers).toContain("/api/account");
    expect(releaseUsers).toContain("GITHUB_ENV");
    expect(releaseUsers).toContain("::add-mask::");
  });

  it("keeps the real authenticated and real-AI release suite mandatory", () => {
    expect(workflow).toContain('REQUIRE_AUTH_E2E: "true"');
    expect(workflow).toContain('RUN_REAL_AI_E2E: "true"');
    expect(workflow).toContain("tests/e2e/core-flow.spec.ts");
  });

  it("reauthenticates before deleting a user and clears non-cascading references", () => {
    expect(accountRoute).toContain("signInWithPassword");
    expect(accountRoute).toContain('z.literal("DELETE")');
    expect(accountRoute).toContain('.from("usage_events").delete().eq("user_id", userId)');
    expect(accountRoute).toContain('.update({ referred_by: null })');
    expect(accountRoute).toContain("admin.auth.admin.deleteUser(userId)");
    expect(accountRoute).toContain('"account_delete", 12');
  });
});
