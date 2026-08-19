import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "https://*.upstash.io",
    "https://*.inngest.com",
    "https://api.razorpay.com",
    "https://*.razorpay.com",
    "https://integrate.api.nvidia.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
  ];

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://api.razorpay.com https://*.razorpay.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.razorpay.com https://*.razorpay.com",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function nextWithSecurityHeaders(request: NextRequest) {
  // UUID hex is valid nonce-source base64-value syntax and avoids Node-only Buffer at the edge.
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return { response, requestHeaders, csp };
}

export async function proxy(request: NextRequest) {
  const security = nextWithSecurityHeaders(request);
  let supabaseResponse = security.response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const protectedRoutes = ["/app", "/builder", "/dashboard", "/resume", "/settings"];
  const isProtected = protectedRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`),
  );

  const secureRedirect = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.headers.set("Content-Security-Policy", security.csp);
    return response;
  };

  // If Supabase is not configured, protected routes fail closed to login.
  if (!supabaseUrl || !supabaseKey) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.searchParams.set("next", next);
      return secureRedirect(url);
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
          supabaseResponse = NextResponse.next({
            request: { headers: security.requestHeaders },
          });
          supabaseResponse.headers.set("Content-Security-Policy", security.csp);
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
      return secureRedirect(url);
    }
  } catch {
    // Do not log auth/session material from the edge boundary. Protected routes fail closed.
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return secureRedirect(url);
    }
  }

  return supabaseResponse;
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
