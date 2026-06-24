import { isSupabaseEnvConfigured } from "../supabase/config";

export function isDemoMode(): boolean {
  return !isSupabaseEnvConfigured();
}

export function isSupabaseMode(): boolean {
  return isSupabaseEnvConfigured();
}
