import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

const ClientErrorSchema = z.object({
  source: z.enum(["window-error", "unhandled-rejection", "react-boundary"]),
  errorName: z.string().trim().min(1).max(80).regex(/^[A-Za-z][A-Za-z0-9_.:-]*$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  route: z.string().trim().min(1).max(300).regex(/^\/(?!\/)/),
  digest: z.string().trim().max(128).optional(),
}).strict();

export async function POST(request: Request) {
  const parsed = await readJsonLimited(request, 4_096, ClientErrorSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: parsed.code, message: "Invalid telemetry payload." } },
      { status: parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
    );
  }

  // This endpoint is intentionally public so failures on login/marketing pages
  // can still be observed. It accepts no raw message, stack, email, or payload,
  // and is independently rate limited by a salted IP hash.
  const rateLimit = await checkRateLimit(null, getClientIp(request), "client_error_telemetry", 60);
  if (!rateLimit.allowed) {
    // Telemetry must never become a user-visible failure loop. A dropped event is
    // safer than allowing an attacker to amplify logging volume.
    return new NextResponse(null, { status: 204 });
  }

  logger.error("[client-observability] Browser error fingerprint", {
    source: parsed.data.source,
    errorName: parsed.data.errorName,
    fingerprint: parsed.data.fingerprint,
    route: parsed.data.route,
    digest: parsed.data.digest,
  });

  return new NextResponse(null, {
    status: 202,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
