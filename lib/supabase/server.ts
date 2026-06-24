import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "./config";

const config = getPublicSupabaseConfig();
export const isServerSupabaseConfigured = Boolean(config);

export async function createServerSupabaseClient() {
  if (!isServerSupabaseConfigured) throw new Error("Supabase is not configured. Missing environment variables.");
  
  const cookieStore = await cookies();

  return createServerClient(
    config?.url as string,
    config?.anonKey as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored, happens when called from Server Component
          }
        },
      },
    },
  );
}
