import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { parsePdfIsolated } from "@/lib/pdf/parse-isolated";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_PDF_BYTES + 1_000_000;
const MAX_EXTRACTED_CHARS = 120_000;

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const rateLimit = await checkRateLimit(
      auth.user.id,
      getClientIp(request),
      "pdf_extract",
      10,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "PDF extraction limit reached. Try again later." } },
        { status: 429 },
      );
    }

    // request.formData() buffers multipart input before file.size can be checked.
    // Require a bounded transport-level length first so an attacker cannot make
    // the parser consume an arbitrarily large multipart body before rejection.
    const declaredLengthHeader = request.headers.get("content-length");
    if (!declaredLengthHeader) {
      return NextResponse.json(
        { error: { code: "CONTENT_LENGTH_REQUIRED", message: "PDF uploads require a Content-Length header." } },
        { status: 411 },
      );
    }
    const declaredLength = Number(declaredLengthHeader);
    if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_CONTENT_LENGTH", message: "Invalid upload size." } },
        { status: 400 },
      );
    }
    if (declaredLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "PDF files must be 8 MB or smaller." } },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "Upload a PDF file." } },
        { status: 400 },
      );
    }

    const isPdfName = file.name.toLowerCase().endsWith(".pdf");
    const isPdfMime = !file.type || file.type === "application/pdf";
    if (!isPdfName || !isPdfMime) {
      return NextResponse.json(
        { error: { code: "INVALID_FILE_TYPE", message: "Only PDF files are supported." } },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "PDF files must be 8 MB or smaller." } },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { error: { code: "INVALID_PDF", message: "The uploaded file is not a valid PDF." } },
        { status: 400 },
      );
    }

    const parsed = await parsePdfIsolated(buffer);
    const rawText = parsed.text.trim();
    const text = rawText.slice(0, MAX_EXTRACTED_CHARS);
    if (!text) {
      return NextResponse.json(
        { error: { code: "NO_TEXT_FOUND", message: "No readable text was found in this PDF." } },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text,
      truncated: rawText.length > MAX_EXTRACTED_CHARS || parsed.pageLimited,
      pageLimited: parsed.pageLimited,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "PDF_PARSE_TIMEOUT";
    logger.warn("[extract-pdf] Isolated PDF parse failed", { timedOut });
    return NextResponse.json(
      { error: { code: timedOut ? "PDF_PARSE_TIMEOUT" : "PDF_PARSE_FAILED", message: timedOut ? "PDF parsing took too long." : "Failed to parse PDF." } },
      { status: timedOut ? 422 : 500 },
    );
  }
}
