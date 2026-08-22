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

  it("tells the user to verify their email instead of claiming email delivery is disabled", () => {
    const signup = source("app/signup/page.tsx");
    const login = source("app/login/page.tsx");
    expect(signup).toContain("Verification email requested");
    expect(signup).not.toContain("No inbox detour");
    expect(signup).not.toContain("delivery is not configured");
    expect(login).toContain("Your email is not verified yet");
    expect(login).not.toContain("earlier beta signup flow");
  });
});
