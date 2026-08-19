import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/observability/logger";

const ratelimiters = new Map<string, Ratelimit>();

// Legacy event names that represent general AI work all map to one shared
// economic budget. New code should call checkAiActionRateLimit directly.
const GLOBAL_AI_EVENTS = new Set([
  "builder_message",
  "resume_agent",
  "resume_improve",
  "resume_generate",
  "resume_audit",
  "job_analyzer",
]);

function canonicalEventName(eventType: string) {
  return GLOBAL_AI_EVENTS.has(eventType) ? "global_ai_daily" : eventType;
}

function getRatelimiter(eventType: string, maxLimit: number) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) throw new Error("Upstash Redis is not configured");
  const canonicalEvent = canonicalEventName(eventType);
  const key = `${canonicalEvent}_${maxLimit}`;
  if (!ratelimiters.has(key)) {
    ratelimiters.set(key, new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(maxLimit, "24 h"),
      analytics: true,
      prefix: `careeros:${canonicalEvent}`,
    }));
  }
  return ratelimiters.get(key)!;
}

async function identifierFor(userId: string | null, ipHash: string) {
  const salt = process.env.RATE_LIMIT_SALT || "development-rate-limit-salt";
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ipHash + salt));
  const finalIpHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return userId || finalIpHash;
}

export async function checkRateLimit(
  userId: string | null,
  ipHash: string,
  eventType: string,
  maxLimit: number,
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_NOT_CONFIGURED" };
    return { allowed: true, remaining: maxLimit };
  }
  if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === "production") {
    return { allowed: false, remaining: 0, error: "RATE_LIMIT_SALT_NOT_CONFIGURED" };
  }
  try {
    const identifier = await identifierFor(userId, ipHash);
    const { success, remaining } = await getRatelimiter(eventType, maxLimit).limit(identifier);
    return { allowed: success, remaining };
  } catch (error) {
    logger.error("[rate-limit] Upstash Redis check failed", { error });
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_CHECK_FAILED" };
    return { allowed: true, remaining: maxLimit };
  }
}

export async function checkGlobalAiRateLimit(
  userId: string | null,
  ipHash: string,
  maxLimit: number,
) {
  return checkRateLimit(userId, ipHash, "global_ai_daily", maxLimit);
}

/**
 * Consume the global AI budget, then an optional feature-specific sublimit.
 * A feature cannot bypass the global account budget by owning its own bucket.
 */
export async function checkAiActionRateLimit(
  userId: string | null,
  ipHash: string,
  globalMaxLimit: number,
  featureType?: string,
  featureMaxLimit?: number,
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  const global = await checkGlobalAiRateLimit(userId, ipHash, globalMaxLimit);
  if (!global.allowed || !featureType || featureMaxLimit == null) return global;

  const feature = await checkRateLimit(userId, ipHash, featureType, featureMaxLimit);
  if (!feature.allowed) return feature;
  return { allowed: true, remaining: Math.min(global.remaining, feature.remaining) };
}
