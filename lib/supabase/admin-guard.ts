import { createServerSupabaseClient } from "./server";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export async function requireAdminUser(): Promise<AdminGuardResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 401, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id };
}
