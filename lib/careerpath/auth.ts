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
  if (process.env.NODE_ENV === "production" && !isServerSupabaseConfigured) {
    return NextResponse.json(
      {
        error: {
          code: "SUPABASE_REQUIRED",
          message: "Production requires Supabase configuration.",
          recoverable: false
        }
      },
      { status: 500 }
    );
  }
  return null;
}
