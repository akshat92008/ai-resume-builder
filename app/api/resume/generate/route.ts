import { NextResponse } from "next/server";

export const maxDuration = 60;
import { createResumeRecord } from "@/lib/careerpath/agents";
import { writeResumeAgent } from "@/lib/careerpath/orchestrator";
import { verifyResumeCandidate } from "@/lib/careerpath/verified-resume";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/db";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";
import { requireAiAccess } from "@/lib/careerpath/auth";

const GenerateRequestSchema = z.object({
  sessionId: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 8_000, GenerateRequestSchema);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "sessionId is required and invalid.", recoverable: true } },
        { status: parsedBody.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
      );
    }
    const body = parsedBody.data;

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(auth.user.id, ipHash, entitlements.aiActionsPerDay);
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
    const targetRole = session.targetRole || "Target Role";
    const verified = await verifyResumeCandidate({
      content: draft,
      currentResume: null,
      userId: auth.user.id,
      legacyProfile: session.profile,
      instruction: `Build a truthful resume for ${targetRole} using only the supplied Career Memory.`,
      mode: "build",
      targetRole,
      metadata: { userId: auth.user.id },
    });

    const resume = createResumeRecord({
      userId: auth.user.id,
      mode: session.mode,
      targetRole,
      content: verified.content,
      profile: session.profile,
      title: `${targetRole || "CareerOS"} Resume`,
      audit: verified.audit,
    });
    resume.careerProfile = verified.careerProfile;
    resume.score = verified.score;

    session.currentStep = "generated";
    session.resumeId = resume.id;
    await saveSession(session);
    await saveServerResume(resume, auth.user.id);

    return NextResponse.json({
      resumeId: resume.id,
      content: resume.content,
      score: resume.score,
      audit: resume.audit,
      verification: {
        removedUnsupportedClaims: verified.provenance.removedClaims,
        warnings: verified.validation.warnings.length,
      },
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
