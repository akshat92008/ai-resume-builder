import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(eventType: string, maxLimit: number) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    throw new Error("Upstash Redis is not configured");
  }

  const key = `${eventType}_${maxLimit}`;
  if (!ratelimiters.has(key)) {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    ratelimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxLimit, "24 h"),
        analytics: true,
      })
    );
  }
  return ratelimiters.get(key)!;
}

export async function checkRateLimit(
  userId: string | null,
  ipHash: string,
  eventType: string,
  maxLimit: number
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: true, remaining: maxLimit };
  }

  const salt = process.env.RATE_LIMIT_SALT || "fallback-production-salt-secure-hash";
  
  const encoder = new TextEncoder();
  const data = encoder.encode(ipHash + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const finalIpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const identifier = userId || finalIpHash;
  const ratelimiter = getRatelimiter(eventType, maxLimit);

  try {
    const { success, remaining } = await ratelimiter.limit(identifier);
    return { allowed: success, remaining };
  } catch (error) {
    console.error("[rate-limit] Upstash Redis error:", error);
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, error: "RATE_LIMIT_CHECK_FAILED" };
    }
    return { allowed: true, remaining: maxLimit };
  }
}
