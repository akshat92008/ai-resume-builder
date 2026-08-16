import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { listJobApplications } from "@/lib/careerpath/db-jobs";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { buildCareerLoopAnalyticsData } from "@/lib/careerloop/conversion";

export async function GET(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const rateLimit = await checkRateLimit(auth.user.id, getClientIp(request), "analytics_read", 30);
    if (!rateLimit.allowed) return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", recoverable: true } }, { status: 429 });
    return NextResponse.json(buildCareerLoopAnalyticsData(await listJobApplications(auth.user.id)));
  } catch (error: unknown) {
    logger.error("[api/analytics] Error fetching analytics", { error });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Failed to load analytics" } }, { status: 500 });
  }
}
