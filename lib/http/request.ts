const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "forwarded",
] as const;

function normalizeForwardedValue(header: string, value: string) {
  if (header === "forwarded") {
    const match = value.match(/for="?([^;,"]+)/i);
    return match?.[1] || "";
  }

  return value.split(",")[0]?.trim() || "";
}

export function getClientIp(request: Request) {
  for (const header of IP_HEADERS) {
    const rawValue = request.headers.get(header);
    if (!rawValue) continue;

    const candidate = normalizeForwardedValue(header, rawValue)
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim();

    if (/^[a-f0-9:.]+$/i.test(candidate)) {
      return candidate;
    }
  }

  return "unknown";
}

export class RequestBodyError extends Error {
  constructor(
    public readonly code: "PAYLOAD_TOO_LARGE" | "INVALID_JSON",
    message: string,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

/**
 * Reads JSON only after enforcing a byte limit. This prevents request.json()
 * from allocating arbitrarily large attacker-controlled payloads before
 * validation runs.
 */
export async function readJsonLimited<T = unknown>(request: Request, maxBytes = 50_000): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError("PAYLOAD_TOO_LARGE", "Request payload is too large.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestBodyError("PAYLOAD_TOO_LARGE", "Request payload is too large.");
  }

  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    throw new RequestBodyError("INVALID_JSON", "Request body must be valid JSON.");
  }
}
