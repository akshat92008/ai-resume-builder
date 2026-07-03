/**
 * Next.js Edge Middleware — Route Protection
 *
 * Protects authenticated routes (/dashboard/*, /builder/*, /app/*) at the
 * CDN edge. Unauthenticated users are redirected to /login.
 *
 * When Supabase is not configured (local dev without env vars), all
 * routes are allowed through to avoid blocking development.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Routes that require a valid Supabase session. */
const PROTECTED_PATTERNS = ["/dashboard", "/builder", "/app"];

/** Routes that should redirect TO login if user is NOT authenticated. */
function isProtectedRoute(pathname: string) {
  return PROTECTED_PATTERNS.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, pass through (local dev mode)
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Only check auth on protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Create a Supabase client scoped to this request
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no session, redirect to login with a return-to param
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - API routes (handled by their own auth)
     * - Public pages (/, /login, /signup, /pricing, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)",
  ],
};
