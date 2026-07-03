import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;

    const ipHash = getClientIp(request);
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "pdf_generate", 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "PDF generation limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get("id");
    if (!resumeId) {
      return NextResponse.json({ error: "Missing resume id" }, { status: 400 });
    }

    // Dynamic import to avoid bundling chromium binary in non-PDF routes
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");

    // Configure chromium for serverless (Vercel / AWS Lambda)
    chromium.setGraphicsMode = false;

    const browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Navigate to the resume print page — the ?print=true query
    // param tells the page to hide UI chrome for a clean PDF
    await page.goto(`${baseUrl}/resume/${resumeId}?print=true`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    });

    await browser.close();

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${resumeId}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("[api/pdf] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again." },
      { status: 500 },
    );
  }
}
