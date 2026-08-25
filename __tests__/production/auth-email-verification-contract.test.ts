import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("production auth email verification contract", () => {
  it("uses normal Supabase signup so confirmation emails can actually be generated", () => {
    const route = source("app/api/auth/signup/route.ts");
    expect(route).toContain("supabase.auth.signUp");
    expect(route).toContain("emailRedirectTo");
    expect(route).not.toContain("createSupabaseAdminClient");
    expect(route).not.toContain("admin.auth.admin.createUser");
    expect(route).not.toMatch(/\bemail_confirm\s*:\s*true\s*[,}]/);
  });

  it("keeps signup abuse protection while product feature caps are disabled", () => {
    const route = source("app/api/auth/signup/route.ts");
    expect(route).toContain('checkRateLimit(null, getClientIp(request), "signup", 20)');
  });

  it("states verification is required without falsely guaranteeing repeated-signup delivery", () => {
    const signup = source("app/signup/page.tsx");
    const login = source("app/login/page.tsx");
    const resend = source("app/api/auth/resend-verification/route.ts");
    expect(signup).toContain("Email verification is required before you can sign in");
    expect(signup).toContain("Resend verification email");
    expect(signup).toContain("repeat signup attempts may be intentionally masked by Supabase");
    expect(signup).not.toContain("No inbox detour");
    expect(signup).not.toContain("delivery is not configured");
    expect(login).toContain("Your email is not verified yet");
    expect(login).toContain("Resend verification email");
    expect(login).not.toContain("earlier beta signup flow");
    expect(resend).toContain("supabase.auth.resend");
    expect(resend).toContain('type: "signup"');
  });
});
