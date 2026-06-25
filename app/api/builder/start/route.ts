import { NextResponse } from "next/server";
import { createBuilderSession } from "@/lib/careerpath/agents";
import { saveSession } from "@/lib/careerpath/server-store";
import type { BuilderMode } from "@/lib/careerpath/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mode?: BuilderMode;
    targetRole?: string;
  };
  const mode = body.mode ?? "build";
  const session = saveSession(createBuilderSession(mode, body.targetRole ?? ""));
  const message = session.messages[0]?.content ?? "Paste your details. Messy is fine.";

  return NextResponse.json({
    sessionId: session.id,
    message,
    state: session.currentStep,
    session,
  });
}
