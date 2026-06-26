import { NextResponse } from "next/server";
import { getSupabaseUser } from "./db";
import { isServerSupabaseConfigured } from "../supabase/server";

/**
 * Require authenticated user for all app/API access.
 * Supabase is mandatory — no demo fallback.
 */
export async function requireAppAccess(): Promise<{ ok: false; response: NextResponse } | { ok: true; user: { id: string } }> {
  if (!isServerSupabaseConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "SUPABASE_NOT_CONFIGURED",
            message: "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            recoverable: false,
          },
        },
        { status: 500 },
      ),
    };
  }

  const user = await getSupabaseUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "AUTH_REQUIRED", message: "Please log in to use CareerPath AI.", recoverable: true } },
        { status: 401 },
      ),
    };
  }

  return { ok: true, user: user as { id: string } };
}

// Legacy alias
export const requireAiAccess = requireAppAccess;
