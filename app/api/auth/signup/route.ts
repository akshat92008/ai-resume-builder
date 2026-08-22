import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { isPwnedPassword } from "@/lib/auth/pwned-password";

const SignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
}).strict();

export async function POST(request: Request) {
  try {
    const parsed = await readJsonLimited(request, 8_192, SignupSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: "Enter a valid email and password." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }

    // Product feature caps are temporarily disabled for manual testing, but
    // signup remains independently rate-limited because it is a public auth
    // surface and must retain abuse protection.
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

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable." } },
        { status: 503 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;
    const emailRedirectTo = `${new URL(request.url).origin}/login?verified=1`;

    // Use the normal Supabase Auth signup path. This intentionally does NOT use
    // admin.createUser(email_confirm: true): when email confirmation is enabled
    // in Supabase, Auth now generates and sends the real verification email.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      logger.warn("[auth/signup] Signup rejected", {
        code: error.code || "AUTH_ERROR",
        status: error.status,
      });

      const code = error.code === "over_email_send_rate_limit"
        ? "EMAIL_RATE_LIMITED"
        : error.code === "email_address_not_authorized"
          ? "EMAIL_DELIVERY_NOT_CONFIGURED"
          : "SIGNUP_FAILED";
      const message = code === "EMAIL_RATE_LIMITED"
        ? "Too many verification emails were requested. Try again after the email limit resets."
        : code === "EMAIL_DELIVERY_NOT_CONFIGURED"
          ? "Verification email cannot be sent to this address while Supabase is using its default test mailer. Custom SMTP must be configured for public email delivery."
          : "Unable to create the account or send its verification email. Check the address and try again.";

      return NextResponse.json(
        { error: { code, message } },
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
