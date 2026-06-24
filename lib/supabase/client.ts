import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from "./config";

const config = getPublicSupabaseConfig();
export const isSupabaseConfigured = Boolean(config);

if (!isSupabaseConfigured || !config) {
  throw new Error("Supabase is not configured. Missing environment variables.");
}

export const supabase = createBrowserClient(
  config.url,
  config.anonKey
);
