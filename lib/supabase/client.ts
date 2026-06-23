import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are provided, use real Supabase. Otherwise, provide a mock/dummy client
// that will safely fail or bypass, relying on our mock data for the UI state.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mock-supabase.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
      }
    });

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
