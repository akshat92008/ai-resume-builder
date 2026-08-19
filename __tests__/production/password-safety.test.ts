import { describe, expect, it, vi } from "vitest";
import { isPwnedPassword, PasswordSafetyUnavailableError } from "@/lib/auth/pwned-password";

describe("compromised password protection", () => {
  it("uses HIBP k-anonymity and rejects a matching breached password", async () => {
    // SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.pwnedpasswords.com/range/5BAA6");
      expect(new Headers(init?.headers).get("Add-Padding")).toBe("true");
      expect(new Headers(init?.headers).get("User-Agent")).toBe("CareerOS-Password-Safety/1.0");
      return new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:3303003\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0", { status: 200 });
    }) as typeof fetch;

    await expect(isPwnedPassword("password", { fetchImpl })).resolves.toBe(true);
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
