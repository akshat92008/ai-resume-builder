import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/observability/logger";

const ratelimiters = new Map<string, Ratelimit>();

const GLOBAL_AI_EVENTS = new Set([
  "builder_message",
  "resume_agent",
  "resume_improve",
  "resume_generate",
  "resume_audit",
  "job_analyzer",
]);

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
  error?: string;
};

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
): Promise<RateLimitResult> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") return { allowed: false, remaining: 0, error: "RATE_LIMIT_NOT_CONFIGURED" };
    return { allowed: true, remaining: maxLimit };
  }
  if (!process.env.RATE_LIMIT_SALT && process.env.NODE_ENV === "production") {
    return { allowed: false, remaining: 0, error: "RATE_LIMIT_SALT_NOT_CONFIGURED" };
  }
  try {
    const identifier = await identifierFor(userId, ipHash);
    const { success, remaining, reset } = await getRatelimiter(eventType, maxLimit).limit(identifier);
    return {
      allowed: success,
      remaining,
      resetAt: typeof reset === "number" ? reset : undefined,
    };
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
 * Enforce a feature sublimit before consuming the shared AI budget. This keeps
 * a denied tailoring/outreach request from burning a global AI action as well.
 * The global bucket still prevents feature-specific endpoints from bypassing
 * the account-wide economic boundary.
 */
export async function checkAiActionRateLimit(
  userId: string | null,
  ipHash: string,
  globalMaxLimit: number,
  featureType?: string,
  featureMaxLimit?: number,
): Promise<RateLimitResult> {
  let feature: RateLimitResult | null = null;
  if (featureType && featureMaxLimit != null) {
    feature = await checkRateLimit(userId, ipHash, featureType, featureMaxLimit);
    if (!feature.allowed) return feature;
  }

  const global = await checkGlobalAiRateLimit(userId, ipHash, globalMaxLimit);
  if (!global.allowed) return global;
  return {
    allowed: true,
    remaining: feature ? Math.min(global.remaining, feature.remaining) : global.remaining,
    resetAt: global.resetAt,
  };
}
