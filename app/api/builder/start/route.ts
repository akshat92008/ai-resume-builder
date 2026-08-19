import { NextResponse } from "next/server";

export const maxDuration = 60;
import { createBuilderSession } from "@/lib/careerpath/agents";
import { saveSession } from "@/lib/careerpath/db";
import { z } from "zod";
import { requireAiAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited, RequestBodyError } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

const StartRequestSchema = z.object({
  mode: z.enum(["build", "improve", "tailor"]).optional(),
  targetRole: z.string().trim().max(200).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    // Starting a session is not an inference action. Keep only an abuse-control
    // limit here; the first actual model operation consumes the global AI budget.
    const rateLimit = await checkRateLimit(userId, getClientIp(request), "builder_start_abuse", 30);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many sessions started. Please try again later.", recoverable: true } },
        { status: 429 },
      );
    }

    const parseResult = StartRequestSchema.safeParse(await readJsonLimited(request, 10_000));
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request payload.", recoverable: true } },
        { status: 400 },
      );
    }

    const body = parseResult.data;
    const session = createBuilderSession(userId, body.mode ?? "build", body.targetRole ?? "");
    await saveSession(session);
    const message = session.messages[0]?.content ?? "Paste your details. Messy is fine.";

    return NextResponse.json({ sessionId: session.id, message, state: session.currentStep, session });
  } catch (err) {
    if (err instanceof RequestBodyError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, recoverable: true } },
        { status: err.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    logger.error("[builder/start] Error", { error: err });
    return NextResponse.json(
      { error: { code: "START_FAILED", message: "Unable to start builder session. Please try again.", recoverable: true } },
      { status: 500 },
    );
  }
}
