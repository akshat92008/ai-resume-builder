import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
const ratelimiters = new Map<string, Ratelimit>();
function getRatelimiter(eventType: string, maxLimit: number) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL; const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) throw new Error("Upstash Redis is not configured");
  const key = `${eventType}_${maxLimit}`;
  if (!ratelimiters.has(key)) ratelimiters.set(key, new Ratelimit({ redis: new Redis({ url: redisUrl, token: redisToken }), limiter: Ratelimit.slidingWindow(maxLimit, "24 h"), analytics: true }));
  return ratelimiters.get(key)!;
}
export async function checkRateLimit(userId: string | null, ipHash: string, eventType: string, maxLimit: number): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_NOT_CONFIGURED" };
    return { allowed: true, remaining: maxLimit };
  }
  if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_SALT_NOT_CONFIGURED" };
  const salt = process.env.RATE_LIMIT_SALT || "development-rate-limit-salt";
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ipHash + salt));
  const finalIpHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const identifier = userId || finalIpHash;
  try {
    const { success, remaining } = await getRatelimiter(eventType, maxLimit).limit(identifier);
    return { allowed: success, remaining };
  } catch (error) {
    console.error("[rate-limit] Upstash Redis error:", error);
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_CHECK_FAILED" };
    return { allowed: true, remaining: maxLimit };
  }
}
