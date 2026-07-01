import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "./config";

export const isSupabaseAdminConfigured = Boolean(
  getPublicSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let adminClientInstance: any = null;

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured) return null;
  if (adminClientInstance) return adminClientInstance;

  const config = getPublicSupabaseConfig();
  if (!config) return null;

  adminClientInstance = createClient(
    config.url,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return adminClientInstance;
}
