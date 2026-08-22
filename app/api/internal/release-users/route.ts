import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGithubActionsReleaseToken } from "@/lib/auth/github-actions-oidc";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

const ReleaseUserSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(16).max(128),
}).strict();

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("provision"),
    users: z.array(ReleaseUserSchema).length(2),
  }).strict(),
  z.object({
    action: z.literal("cleanup"),
    userIds: z.array(z.string().uuid()).max(4),
  }).strict(),
]);

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || "";
}

async function authorizeReleaseRequest(request: Request) {
  const token = bearerToken(request);
  const expectedSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  if (!token || !expectedSha) throw new Error("Release authorization is unavailable");
  return verifyGithubActionsReleaseToken(token, expectedSha);
}

function expectedReleaseEmail(email: string, runId: string) {
  const escapedRunId = runId.replace(/[^0-9]/g, "");
  return new RegExp(`^release-${escapedRunId}-[a-f0-9]{12}-[ab]@example\\.com$`, "i").test(email);
}

async function clearUserReferences(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string) {
  const { error: usageError } = await admin.from("usage_events").delete().eq("user_id", userId);
  if (usageError) throw new Error(`usage cleanup failed: ${usageError.code}`);

  const { error: referralError } = await admin
    .from("profiles")
    .update({ referred_by: null })
    .eq("referred_by", userId);
  if (referralError) throw new Error(`referral cleanup failed: ${referralError.code}`);
}

async function deleteReleaseUser(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string) {
  await clearUserReferences(admin, userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`auth user cleanup failed: ${error.code}`);
}

export async function POST(request: Request) {
  let claims;
  try {
    claims = await authorizeReleaseRequest(request);
  } catch (error) {
    logger.warn("[internal/release-users] OIDC authorization rejected", {
      reason: error instanceof Error ? error.message : "authorization failed",
    });
    return NextResponse.json(
      { error: { code: "RELEASE_AUTH_FAILED", message: "Release workflow authorization failed." } },
      { status: 401 },
    );
  }

  const parsed = await readJsonLimited(request, 8_192, RequestSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: parsed.code, message: "Invalid release provisioning request." } },
      { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: { code: "AUTH_UNAVAILABLE", message: "Release user provisioning is unavailable." } },
      { status: 503 },
    );
  }

  if (parsed.data.action === "provision") {
    if (!parsed.data.users.every((user) => expectedReleaseEmail(user.email, claims.run_id))) {
      return NextResponse.json(
        { error: { code: "INVALID_RELEASE_IDENTITY", message: "Release user identity does not match this workflow run." } },
        { status: 400 },
      );
    }

    const created: Array<{ id: string; email: string }> = [];
    try {
      for (const user of parsed.data.users) {
        const email = user.email.toLowerCase();
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: user.password,
          email_confirm: true,
        });
        if (error || !data.user) throw new Error(`release user creation failed: ${error?.code || "missing_user"}`);
        created.push({ id: data.user.id, email });
      }
    } catch (error) {
      for (const user of created.reverse()) {
        try { await deleteReleaseUser(admin, user.id); } catch (cleanupError) {
          logger.error("[internal/release-users] Rollback failed", {
            userId: user.id,
            reason: cleanupError instanceof Error ? cleanupError.message : "cleanup failed",
          });
        }
      }
      logger.error("[internal/release-users] Provisioning failed", {
        reason: error instanceof Error ? error.message : "provisioning failed",
      });
      return NextResponse.json(
        { error: { code: "RELEASE_PROVISION_FAILED", message: "Unable to provision release users." } },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, users: created });
  }

  const errors: string[] = [];
  for (const userId of parsed.data.userIds) {
    try {
      await deleteReleaseUser(admin, userId);
    } catch (error) {
      errors.push(userId);
      logger.error("[internal/release-users] Cleanup failed", {
        userId,
        reason: error instanceof Error ? error.message : "cleanup failed",
      });
    }
  }

  if (errors.length) {
    return NextResponse.json(
      { error: { code: "RELEASE_CLEANUP_FAILED", message: "Unable to remove every release user." } },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, deleted: parsed.data.userIds.length });
}
