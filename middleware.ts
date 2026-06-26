import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
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

      const protectedRoutes = ["/builder", "/dashboard", "/resume"];
      const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

      if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        const next = request.nextUrl.pathname + request.nextUrl.search;
        url.searchParams.set("next", next);
        return NextResponse.redirect(url);
      }
    }
  } catch (error) {
    console.error("Middleware error:", error);
    // Ignore error, return normal response
  }

  return supabaseResponse;
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
