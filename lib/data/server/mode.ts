import { isSupabaseEnvConfigured } from "../../supabase/config";

export function isSupabaseConfigured(): boolean {
  return isSupabaseEnvConfigured();
}

export function isSupabaseMode(): boolean {
  return isSupabaseEnvConfigured();
}

export function getRuntimeMode(): "supabase" | "demo" {
  return isSupabaseEnvConfigured() ? "supabase" : "demo";
}
