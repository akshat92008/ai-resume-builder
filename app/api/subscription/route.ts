import { NextResponse } from "next/server";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { logger } from "@/lib/observability/logger";

export async function GET() {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await getCurrentUserEntitlements());
  } catch (error) {
    logger.error("[api/subscription] Failed to load subscription", { error });
    return NextResponse.json({ error: { code: "SUBSCRIPTION_LOAD_FAILED", message: "Unable to load subscription." } }, { status: 500 });
  }
}
