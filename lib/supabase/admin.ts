import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./config";

export const isSupabaseAdminConfigured = Boolean(
  getPublicSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured) return null;
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  return createClient(
    config.url,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
