import type { NextConfig } from "next";
const isDevelopment = process.env.NODE_ENV !== "production";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
  transpilePackages: ["motion"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Content-Security-Policy", value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co https://*.upstash.io https://*.inngest.com https://api.stripe.com https://integrate.api.nvidia.com",
          "frame-src https://js.stripe.com",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ") },
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
