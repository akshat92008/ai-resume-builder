import { createHash } from "node:crypto";

const PWNED_PASSWORDS_BASE_URL = "https://api.pwnedpasswords.com/range";
const DEFAULT_TIMEOUT_MS = 3_000;

// Keep a tiny deterministic emergency denylist for universally compromised
// passwords so signup and release certification do not depend on a third-party
// network round trip for the highest-risk credentials. HIBP remains the broad
// source of truth for every other password.
const ALWAYS_COMPROMISED_SHA1 = new Set([
  "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8", // "password"
]);

export class PasswordSafetyUnavailableError extends Error {
  constructor() {
    super("Password safety service is unavailable");
    this.name = "PasswordSafetyUnavailableError";
  }
}

/**
 * Checks the free HIBP Pwned Passwords range API using k-anonymity. The full
 * password and full SHA-1 hash never leave CareerOS; only the first five hash
 * characters are sent. Padding is requested so response size does not disclose
 * the queried range as precisely to passive observers.
 */
export async function isPwnedPassword(
  password: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<boolean> {
  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  if (ALWAYS_COMPROMISED_SHA1.has(digest)) return true;

  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await (options.fetchImpl || fetch)(`${PWNED_PASSWORDS_BASE_URL}/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "CareerOS-Password-Safety/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new PasswordSafetyUnavailableError();
    const body = await response.text();
    for (const line of body.split(/\r?\n/)) {
      const [candidate, rawCount] = line.trim().split(":", 2);
      if (candidate?.toUpperCase() !== suffix) continue;
      return Number(rawCount || "0") > 0;
    }
    return false;
  } catch (error) {
    if (error instanceof PasswordSafetyUnavailableError) throw error;
    throw new PasswordSafetyUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}
