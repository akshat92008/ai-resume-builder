import { createBrowserClient } from '@supabase/ssr';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// If credentials are provided, use real Supabase. Otherwise, provide a mock/dummy client
// that will safely fail or bypass, relying on our mock data for the UI state.
export const supabase = isSupabaseConfigured
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    )
  : createBrowserClient('https://mock-supabase.supabase.co', 'mock-key');
