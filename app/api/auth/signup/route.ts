import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

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

    const rateLimit = await checkRateLimit(null, getClientIp(request), "signup", 20);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many signup attempts. Try again later." } },
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

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

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
    });
  } catch (error) {
    logger.error("[auth/signup] Unexpected failure", { error });
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Unable to create account right now." } },
      { status: 500 },
    );
  }
}
