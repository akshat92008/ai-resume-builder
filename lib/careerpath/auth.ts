import { NextResponse } from "next/server";
import { getSupabaseUser } from "./db";
import { isServerSupabaseConfigured } from "../supabase/server";

export async function requireAiAccess() {
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
