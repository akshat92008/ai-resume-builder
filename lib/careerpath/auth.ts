import { NextResponse } from "next/server";
import { getSupabaseUser } from "./db";
import { isServerSupabaseConfigured } from "../supabase/server";

export async function requireAiAccess(): Promise<{ ok: false; response: NextResponse } | { ok: true; user: any }> {
  const user = await getSupabaseUser();

  if (isServerSupabaseConfigured && !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Please log in to use CareerPath AI.", recoverable: true } },
        { status: 401 }
      ),
    };
  }

  return { ok: true, user };
}

export const requireAppAccess = requireAiAccess;

export function requireProductionPersistence() {
  // Allow the application to run in stateless demo mode even in production
  // This improves the first-run experience on Vercel deployments.
  return null;
}
