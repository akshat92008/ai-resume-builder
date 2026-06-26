import { NextResponse } from "next/server";
import { createBuilderSession } from "@/lib/careerpath/agents";
import { saveSession } from "@/lib/careerpath/db";
import type { BuilderMode } from "@/lib/careerpath/types";
import { z } from "zod";
import { requireAiAccess, requireProductionPersistence } from "@/lib/careerpath/auth";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";

const StartRequestSchema = z.object({
  mode: z.enum(["build", "improve", "tailor"]).optional(),
  targetRole: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const prodBlock = requireProductionPersistence();
    if (prodBlock) return prodBlock;

    let userId = null;
    if (isServerSupabaseConfigured) {
      const auth = await requireAiAccess();
      if (!auth.ok) return auth.response;
      userId = auth.user?.id || null;
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
    const session = createBuilderSession(mode, body.targetRole ?? "");
    if (userId) session.userId = userId;
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
