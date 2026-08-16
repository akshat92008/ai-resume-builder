import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 120_000;

// Polyfills for pdf-parse / pdfjs-dist in the Next.js Node build environment.
if (typeof global !== "undefined") {
  if (typeof global.DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  if (typeof global.Path2D === "undefined") {
    (global as any).Path2D = class Path2D {};
  }
  if (typeof global.ImageData === "undefined") {
    (global as any).ImageData = class ImageData {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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

    const data = await pdfParse(buffer);
    const text = String(data.text || "").trim().slice(0, MAX_EXTRACTED_CHARS);
    if (!text) {
      return NextResponse.json(
        { error: { code: "NO_TEXT_FOUND", message: "No readable text was found in this PDF." } },
        { status: 422 },
      );
    }

    return NextResponse.json({ text, truncated: String(data.text || "").length > MAX_EXTRACTED_CHARS });
  } catch (error) {
    logger.error("[extract-pdf] Failed to parse PDF", { error });
    return NextResponse.json(
      { error: { code: "PDF_PARSE_FAILED", message: "Failed to parse PDF." } },
      { status: 500 },
    );
  }
}
