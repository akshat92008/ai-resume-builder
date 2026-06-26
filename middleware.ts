import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const protectedRoutes = ["/app", "/builder", "/dashboard", "/resume"];
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // If Supabase is not configured, redirect protected routes to login
  if (!supabaseUrl || !supabaseKey) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Middleware error:", error);
    // If auth check fails on protected route, redirect to login
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
