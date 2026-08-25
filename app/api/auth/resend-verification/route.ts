import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

const ResendSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export async function POST(request: Request) {
  try {
    const parsed = await readJsonLimited(request, 4_096, ResendSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: parsed.code, message: "Enter a valid email address." } },
        { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }

    const rateLimit = await checkRateLimit(null, getClientIp(request), "resend_verification", 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many verification email requests. Try again later." } },
        { status: 429 },
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
    const emailRedirectTo = `${new URL(request.url).origin}/login?verified=1`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      logger.warn("[auth/resend-verification] Resend rejected", {
        code: error.code || "AUTH_ERROR",
        status: error.status,
      });

      const code = error.code === "over_email_send_rate_limit"
        ? "EMAIL_RATE_LIMITED"
        : error.code === "email_address_not_authorized"
          ? "EMAIL_DELIVERY_NOT_CONFIGURED"
          : "RESEND_FAILED";
      const message = code === "EMAIL_RATE_LIMITED"
        ? "Too many verification emails were requested. Try again after the email limit resets."
        : code === "EMAIL_DELIVERY_NOT_CONFIGURED"
          ? "Verification email delivery is not configured for this address. Configure custom SMTP in Supabase before public signup."
          : "CareerOS could not request another verification email. Check the address and try again.";

      return NextResponse.json(
        { error: { code, message } },
        { status: error.status === 429 ? 429 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "A verification email was requested from Supabase. Check your inbox and spam folder.",
    });
  } catch (error) {
    logger.error("[auth/resend-verification] Unexpected failure", { error });
    return NextResponse.json(
      { error: { code: "RESEND_FAILED", message: "Unable to request a verification email right now." } },
      { status: 500 },
    );
  }
}
