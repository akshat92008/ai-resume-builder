import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("verification resend production regression", () => {
  it("provides an explicit rate-limited Supabase resend endpoint", () => {
    const route = source("app/api/auth/resend-verification/route.ts");
    expect(route).toContain('checkRateLimit(null, getClientIp(request), "resend_verification", 10)');
    expect(route).toContain('supabase.auth.resend({');
    expect(route).toContain('type: "signup"');
  });

  it("does not claim repeated signup definitely sent another email", () => {
    const signup = source("app/signup/page.tsx");
    expect(signup).not.toContain("Verification email requested. Check your inbox");
    expect(signup).toContain("repeat signup attempts may be intentionally masked by Supabase");
  });

  it("offers resend only after an email-not-confirmed sign-in", () => {
    const login = source("app/login/page.tsx");
    expect(login).toContain('error.code === "email_not_confirmed"');
    expect(login).toContain("Resend verification email");
    expect(login).toContain('fetch("/api/auth/resend-verification"');
  });
});
