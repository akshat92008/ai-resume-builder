import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isPwnedPassword, PasswordSafetyUnavailableError } from "@/lib/auth/pwned-password";

describe("compromised password protection", () => {
  it("rejects the emergency-denylisted release probe without an upstream dependency", async () => {
    const fetchImpl = vi.fn(async () => new Response("upstream should not be called", { status: 503 })) as typeof fetch;

    await expect(isPwnedPassword("password", { fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses HIBP k-anonymity and rejects a matching breached password", async () => {
    const candidatePassword = "breached-test-password-!42";
    const digest = createHash("sha1").update(candidatePassword, "utf8").digest("hex").toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
      expect(new Headers(init?.headers).get("Add-Padding")).toBe("true");
      expect(new Headers(init?.headers).get("User-Agent")).toBe("CareerOS-Password-Safety/1.0");
      return new Response(`${suffix}:42\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`, { status: 200 });
    }) as typeof fetch;

    await expect(isPwnedPassword(candidatePassword, { fetchImpl })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("accepts a password whose suffix is absent from the returned range", async () => {
    const fetchImpl = vi.fn(async () => new Response("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:12", { status: 200 })) as typeof fetch;
    await expect(isPwnedPassword("unique-test-password-!42", { fetchImpl })).resolves.toBe(false);
  });

  it("fails closed when the password safety service is unavailable", async () => {
    const fetchImpl = vi.fn(async () => new Response("upstream failure", { status: 503 })) as typeof fetch;
    await expect(isPwnedPassword("another-password", { fetchImpl })).rejects.toBeInstanceOf(PasswordSafetyUnavailableError);
  });
});
