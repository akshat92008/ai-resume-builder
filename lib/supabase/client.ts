import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  
  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}

export const isSupabaseConfigured = Boolean(getPublicSupabaseConfig());
