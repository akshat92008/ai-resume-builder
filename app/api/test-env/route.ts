import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Server-side Environment Variables Check",
    url_exists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    url_value: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT_SET",
    anon_key_exists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    anon_key_value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : "NOT_SET",
    all_keys: Object.keys(process.env).filter(key => key.includes("SUPABASE") || key.includes("NVIDIA") || key.includes("API")),
  });
}
