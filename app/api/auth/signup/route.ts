import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { isPwnedPassword } from "@/lib/auth/pwned-password";

const SignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
}).strict();

async function confirmExistingBetaUser(email: string, password: string) {
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return false;

  // A password match that fails only because the email is unconfirmed proves
  // possession of the password chosen during the earlier broken signup flow.
  // This lets controlled-beta users recover without changing their password.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError?.code !== "email_not_confirmed") return false;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    logger.warn("[auth/signup] Unable to locate unconfirmed beta user", { code: error.code });
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  const user = data.users.find((candidate: { email?: string | null; email_confirmed_at?: string | null }) =>
    candidate.email?.toLowerCase() === normalizedEmail && !candidate.email_confirmed_at,
  );
  if (!user) return false;

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (updateError) {
    logger.warn("[auth/signup] Unable to activate existing beta user", { code: updateError.code });
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const parsed = await readJsonLimited(request, 8_192, SignupSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: "Enter a valid email and password." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }

    const rateLimit = await checkRateLimit(null, getClientIp(request), "signup", 20);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many signup attempts. Try again later." } },
        { status: 429 },
      );
    }

    // Supabase's native leaked-password protection is plan-dependent. Add a
    // free application-layer compensating control on the canonical CareerOS
    // signup path using HIBP k-anonymity: only five SHA-1 prefix characters
    // leave the server. Native Supabase protection remains defense in depth.
    try {
      if (await isPwnedPassword(parsed.data.password)) {
        return NextResponse.json(
          {
            error: {
              code: "COMPROMISED_PASSWORD",
              message: "Choose a different password. This password appears in known breach data.",
            },
          },
          { status: 400 },
        );
      }
    } catch {
      logger.warn("[auth/signup] Password safety service unavailable");
      return NextResponse.json(
        {
          error: {
            code: "PASSWORD_SAFETY_UNAVAILABLE",
            message: "Password safety checks are temporarily unavailable. Please try again.",
          },
        },
        { status: 503 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;
    const admin = createSupabaseAdminClient();

    // Controlled beta: production already has the server-only service role key.
    // Use Supabase Admin Auth to create an immediately usable account rather
    // than sending users into the hosted test-mailer dead end. This does not
    // expose the service key and keeps all password/rate-limit controls above.
    if (admin) {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (!error) {
        return NextResponse.json({ ok: true, requiresEmailConfirmation: false, signedIn: false, mode: "beta" });
      }

      const recovered = await confirmExistingBetaUser(email, password);
      if (recovered) {
        return NextResponse.json({ ok: true, requiresEmailConfirmation: false, signedIn: false, mode: "beta-recovered" });
      }

      logger.warn("[auth/signup] Admin signup rejected", { code: error.code || "AUTH_ERROR", status: error.status });
      return NextResponse.json(
        { error: { code: "ACCOUNT_EXISTS", message: "An account may already exist for this email. Try signing in." } },
        { status: 409 },
      );
    }

    // Local/non-admin fallback keeps standard Supabase semantics. Broad public
    // GA should configure custom SMTP and can return to verified-email signup.
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      logger.warn("[auth/signup] Signup rejected", { code: error.code || "AUTH_ERROR", status: error.status });
      return NextResponse.json(
        { error: { code: "SIGNUP_FAILED", message: "Unable to create account. Check your details or try signing in." } },
        { status: error.status === 429 ? 429 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !data.session,
      signedIn: Boolean(data.session),
      mode: data.session ? "standard" : "email-confirmation",
    });
  } catch (error) {
    logger.error("[auth/signup] Unexpected failure", { error });
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Unable to create account right now." } },
      { status: 500 },
    );
  }
}
