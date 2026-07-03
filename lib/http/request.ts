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
