import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function checkRateLimit(
  userId: string | null,
  ipHash: string,
  eventType: string,
  maxLimit: number
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  if (!isServerSupabaseConfigured) {
    return { allowed: true, remaining: maxLimit };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { allowed: false, remaining: 0, error: "RATE_LIMIT_CONFIG_MISSING" };
  }

  const salt = process.env.RATE_LIMIT_SALT || "fallback-production-salt-secure-hash";
  
  // Use Web Crypto API for Edge compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(ipHash + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const finalIpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Count events for the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  let query = admin
    .from("usage_events")
    .select("id", { count: "exact" })
    .eq("event_type", eventType)
    .gte("created_at", yesterday);
    
  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("ip_hash", finalIpHash).is("user_id", null);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[rate-limit] Error checking rate limit:", error);
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, error: "RATE_LIMIT_CHECK_FAILED" };
    }
    return { allowed: true, remaining: maxLimit }; // Fail open only in dev
  }

  const currentCount = count || 0;
  if (currentCount >= maxLimit) {
    return { allowed: false, remaining: 0 };
  }

  // Record this usage event
  const { error: insertError } = await admin.from("usage_events").insert({
    user_id: userId || null,
    ip_hash: finalIpHash,
    event_type: eventType,
  });

  if (insertError && process.env.NODE_ENV === "production") {
    return { allowed: false, remaining: 0, error: "RATE_LIMIT_RECORD_FAILED" };
  }

  return { allowed: true, remaining: maxLimit - currentCount - 1 };
}
