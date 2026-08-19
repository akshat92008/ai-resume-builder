import { createServerSupabaseClient } from "./server";
import { logger } from "@/lib/observability/logger";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function requireAdminUser(): Promise<AdminGuardResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Authorization service is unavailable." };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    logger.warn("[admin-guard] Auth lookup failed", { status: authError.status, code: authError.code });
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error("[admin-guard] Failed to resolve admin role", { error: profileError });
    return { ok: false, status: 503, error: "Authorization service is unavailable." };
  }

  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id };
}
