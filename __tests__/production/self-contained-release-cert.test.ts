import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github/workflows/core-release.yml"), "utf8");
const releaseUsers = readFileSync(join(root, "scripts/release-users.mjs"), "utf8");
const releaseRoute = readFileSync(join(root, "app/api/internal/release-users/route.ts"), "utf8");
const oidcVerifier = readFileSync(join(root, "lib/auth/github-actions-oidc.ts"), "utf8");
const accountRoute = readFileSync(join(root, "app/api/account/route.ts"), "utf8");

describe("self-contained core release certification", () => {
  it("does not depend on manually maintained authenticated E2E secrets", () => {
    expect(workflow).not.toContain("secrets.E2E_EMAIL");
    expect(workflow).not.toContain("secrets.E2E_PASSWORD");
    expect(workflow).not.toContain("secrets.E2E_USER_B_EMAIL");
    expect(workflow).not.toContain("secrets.E2E_USER_B_PASSWORD");
    expect(workflow).toContain("id-token: write");
  });

  it("provisions and always removes two disposable authenticated users through GitHub OIDC", () => {
    expect(workflow).toContain("node scripts/release-users.mjs provision");
    expect(workflow).toContain("node scripts/release-users.mjs cleanup");
    expect(workflow).toContain("Delete ephemeral release accounts");
    expect(workflow).toContain("if: always()");
    expect(releaseUsers).toContain("/api/internal/release-users");
    expect(releaseUsers).toContain("ACTIONS_ID_TOKEN_REQUEST_URL");
    expect(releaseUsers).toContain("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
    expect(releaseUsers).toContain("careeros-release");
    expect(releaseUsers).toContain("GITHUB_ENV");
    expect(releaseUsers).toContain("::add-mask::");
    expect(releaseUsers).not.toContain("/api/auth/signup");
  });

  it("keeps release-only auto-confirm behind signature, repository, workflow, ref and commit checks", () => {
    expect(releaseRoute).toContain("verifyGithubActionsReleaseToken");
    expect(releaseRoute).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(releaseRoute).toContain("email_confirm: true");
    expect(oidcVerifier).toContain('GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com"');
    expect(oidcVerifier).toContain('RELEASE_AUDIENCE = "careeros-release"');
    expect(oidcVerifier).toContain('RELEASE_REPOSITORY = "akshat92008/ai-resume-builder"');
    expect(oidcVerifier).toContain('RELEASE_REF = "refs/heads/main"');
    expect(oidcVerifier).toContain("claims.workflow_ref !== RELEASE_WORKFLOW_REF");
    expect(oidcVerifier).toContain("claims.sha !== expectedSha");
    expect(oidcVerifier).toContain("crypto.subtle.verify");
  });

  it("keeps the real authenticated and real-AI release suite mandatory", () => {
    expect(workflow).toContain('REQUIRE_AUTH_E2E: "true"');
    expect(workflow).toContain('RUN_REAL_AI_E2E: "true"');
    expect(workflow).toContain("tests/e2e/core-flow.spec.ts");
  });

  it("keeps normal account deletion reauthenticated and deterministic", () => {
    expect(accountRoute).toContain("signInWithPassword");
    expect(accountRoute).toContain('z.literal("DELETE")');
    expect(accountRoute).toContain('.from("usage_events").delete().eq("user_id", userId)');
    expect(accountRoute).toContain('.update({ referred_by: null })');
    expect(accountRoute).toContain("admin.auth.admin.deleteUser(userId)");
    expect(accountRoute).toContain('"account_delete", 12');
  });
});
