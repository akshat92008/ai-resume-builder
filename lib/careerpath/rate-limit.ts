import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import crypto from "crypto";

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

  const salt = process.env.RATE_LIMIT_SALT || "default-salt";
  const finalIpHash = crypto.createHash("sha256").update(ipHash + salt).digest("hex");

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
    return { allowed: true, remaining: maxLimit }; // Fail open
  }

  const currentCount = count || 0;
  if (currentCount >= maxLimit) {
    return { allowed: false, remaining: 0 };
  }

  // Record this usage event
  await admin.from("usage_events").insert({
    user_id: userId || null,
    ip_hash: finalIpHash,
    event_type: eventType,
  });

  return { allowed: true, remaining: maxLimit - currentCount - 1 };
}
