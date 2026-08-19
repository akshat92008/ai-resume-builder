import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getServerResume } from "@/lib/careerpath/db";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { renderResumePdf } from "@/lib/careerpath/pdf-renderer";
import { verifyResumePdfArtifact } from "@/lib/careerpath/ats-artifact";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const IdSchema = z.string().uuid();
function safeFilename(value: string) { return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "resume"; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: { code: "INVALID_ID", message: "Invalid resume ID." } }, { status: 400 });

    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "resume_pdf_export", 30);
    if (!rateLimit.allowed) return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "PDF export limit reached. Try again later." } }, { status: 429 });

    const resume = await getServerResume(id, auth.user.id);
    if (!resume) return NextResponse.json({ error: { code: "RESUME_NOT_FOUND", message: "Resume not found." } }, { status: 404 });

    const pdf = renderResumePdf(resume.content);
    const verification = await verifyResumePdfArtifact(resume.content, pdf);
    if (!verification.verified) {
      logger.error("[resume-pdf] Canonical PDF failed round-trip ATS verification", { resumeId: id, userId: auth.user.id, artifactScore: verification.artifactScore, missingSections: verification.missingSections, missingSignals: verification.missingSignals });
      return NextResponse.json({ error: { code: "PDF_VERIFICATION_FAILED", message: "CareerOS could not verify this PDF artifact. Export was blocked rather than giving you an unverified file.", details: verification } }, { status: 422 });
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeFilename(resume.title)}.pdf"`,
        "cache-control": "private, no-store, max-age=0",
        "x-careeros-ats-artifact-score": String(verification.artifactScore),
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("[resume-pdf] Export failed", { error: error instanceof Error ? error.message : "unknown error" });
    return NextResponse.json({ error: { code: "PDF_EXPORT_FAILED", message: "Unable to generate the verified resume PDF." } }, { status: 500 });
  }
}
