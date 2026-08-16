import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const connectSources = [
  "'self'",
  "https://*.supabase.co",
  "https://*.upstash.io",
  "https://*.inngest.com",
  "https://api.stripe.com",
  "https://integrate.api.nvidia.com",
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
  transpilePackages: ["motion"],
  async headers() {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSources.join(" ")}`,
      "frame-src https://js.stripe.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    return [{
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-XSS-Protection", value: "0" },
        { key: "Content-Security-Policy", value: csp },
      ],
    }];
  },
  turbopack: { root: process.cwd() },
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === "true") config.watchOptions = { ignored: /.*/ };
    return config;
  },
};

export default nextConfig;
