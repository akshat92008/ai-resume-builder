import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from "./config";

const config = getPublicSupabaseConfig();
export const isSupabaseConfigured = Boolean(config);

export const supabase = createBrowserClient(
  config?.url || 'https://missing-supabase-url.supabase.co',
  config?.anonKey || 'missing-anon-key'
);
