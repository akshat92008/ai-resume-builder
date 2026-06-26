export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith("http") || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseEnvConfigured() {
  return Boolean(getPublicSupabaseConfig());
}
