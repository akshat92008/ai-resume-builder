import { NextResponse } from "next/server";
import { createBuilderSession } from "@/lib/careerpath/agents";
import { saveSession } from "@/lib/careerpath/db";
import type { BuilderMode } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: BuilderMode;
      targetRole?: string;
    };
    const mode = body.mode ?? "build";
    const session = createBuilderSession(mode, body.targetRole ?? "");
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
