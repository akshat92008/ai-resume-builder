import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
import { createBuilderSession } from "@/lib/careerpath/agents";
import { saveSession } from "@/lib/careerpath/db";
import type { BuilderMode } from "@/lib/careerpath/types";
import { z } from "zod";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { getClientIp } from "@/lib/http/request";

const StartRequestSchema = z.object({
  mode: z.enum(["build", "improve", "tailor"]).optional(),
  targetRole: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkRateLimit(userId, ipHash, "builder_start", entitlements.aiActionsPerDay);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => ({}));
    const parseResult = StartRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request payload.", recoverable: true } },
        { status: 400 },
      );
    }
    const body = parseResult.data;
    
    const mode = body.mode ?? "build";
    const session = createBuilderSession(userId, mode, body.targetRole ?? "");
    await saveSession(session);
    const message = session.messages[0]?.content ?? "Paste your details. Messy is fine.";

    return NextResponse.json({
      sessionId: session.id,
      message,
      state: session.currentStep,
      session,
    });
  } catch (err) {
    console.error("[builder/start] Error:", err);
    return NextResponse.json(
      {
        error: {
          code: "START_FAILED",
          message: "Unable to start builder session. Please try again.",
          recoverable: true,
        },
      },
      { status: 500 },
    );
  }
}
