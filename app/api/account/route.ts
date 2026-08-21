import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

const DeleteAccountSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  confirm: z.literal("DELETE"),
}).strict();

export async function DELETE(request: Request) {
  try {
    const parsed = await readJsonLimited(request, 8_192, DeleteAccountSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: "Enter valid account credentials and confirm deletion." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }

    const rateLimit = await checkRateLimit(null, getClientIp(request), "account_delete", 12);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many account deletion attempts. Try again later." } },
        { status: 429 },
      );
    }

    const config = getPublicSupabaseConfig();
    const admin = createSupabaseAdminClient();
    if (!config || !admin) {
      return NextResponse.json(
        { error: { code: "AUTH_UNAVAILABLE", message: "Account deletion is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const authClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const email = parsed.data.email.toLowerCase();
    const { data, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (signInError || !data.user || data.user.email?.toLowerCase() !== email) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "The supplied account credentials are not valid." } },
        { status: 401 },
      );
    }

    const userId = data.user.id;

    // Most CareerOS data is protected by ON DELETE CASCADE from auth.users.
    // Clean the two known non-cascading references first so deletion remains
    // deterministic even for accounts that have generated usage/referral data.
    const { error: usageError } = await admin.from("usage_events").delete().eq("user_id", userId);
    if (usageError) {
      logger.error("[account/delete] Failed to clear usage rows", { userId, code: usageError.code });
      return NextResponse.json(
        { error: { code: "ACCOUNT_DELETE_FAILED", message: "Unable to delete the account right now." } },
        { status: 503 },
      );
    }

    const { error: referralError } = await admin
      .from("profiles")
      .update({ referred_by: null })
      .eq("referred_by", userId);
    if (referralError) {
      logger.error("[account/delete] Failed to clear referral references", { userId, code: referralError.code });
      return NextResponse.json(
        { error: { code: "ACCOUNT_DELETE_FAILED", message: "Unable to delete the account right now." } },
        { status: 503 },
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      logger.error("[account/delete] Supabase user deletion failed", { userId, code: deleteError.code });
      return NextResponse.json(
        { error: { code: "ACCOUNT_DELETE_FAILED", message: "Unable to delete the account right now." } },
        { status: 503 },
      );
    }

    logger.info("[account/delete] Account deleted", { userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[account/delete] Unexpected failure", { error });
    return NextResponse.json(
      { error: { code: "ACCOUNT_DELETE_FAILED", message: "Unable to delete the account right now." } },
      { status: 500 },
    );
  }
}
