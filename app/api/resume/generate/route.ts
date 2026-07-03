import { NextResponse } from "next/server";

export const maxDuration = 60;
import { createResumeRecord } from "@/lib/careerpath/agents";
import { writeResumeAgent, auditResumeAgent } from "@/lib/careerpath/orchestrator";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/db";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";

import { requireAiAccess } from "@/lib/careerpath/auth";

const GenerateRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const json = await request.json().catch(() => ({}));
    const parseResult = GenerateRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: "sessionId is required and invalid.", recoverable: true } }, { status: 400 });
    }
    const body = parseResult.data;

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "resume_generate", 5);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const session = await getSession(body.sessionId);
    if (!session || session.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "SESSION_NOT_FOUND", message: "Builder session not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const draft = await writeResumeAgent(session.profile, session.mode, "");
    const draftAudit = await auditResumeAgent(draft, session.targetRole, "");

    const resume = createResumeRecord({
      mode: session.mode,
      targetRole: session.targetRole,
      content: draft,
      profile: session.profile,
      title: `${session.targetRole || "CareerPath"} Resume`,
      audit: draftAudit,
    });

    resume.userId = auth.user.id;
    resume.audit = draftAudit;
    resume.score = draftAudit.score;

    session.currentStep = "generated";
    session.resumeId = resume.id;
    session.userId = auth.user.id;
    await saveSession(session);
    await saveServerResume(resume, auth.user.id);

    return NextResponse.json({
      resumeId: resume.id,
      content: resume.content,
      score: resume.score,
      audit: resume.audit,
      resume,
    });
  } catch (err) {
    logger.error("[builder/generate] Error", { error: err });
    return NextResponse.json(
      { error: { code: "GENERATE_FAILED", message: "Unable to generate resume.", recoverable: true } },
      { status: 500 },
    );
  }
}
