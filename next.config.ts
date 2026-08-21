import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
  transpilePackages: ["motion"],
  serverExternalPackages: ["pdf-parse"],
  // pdf-parse v2 lazily imports its PDF.js worker at runtime. Next/Vercel's
  // server file tracer does not discover that dynamic relative import when the
  // package is externalized, so the production lambda otherwise ships without
  // pdf.worker.mjs and canonical ATS round-trip verification fails at runtime.
  outputFileTracingIncludes: {
    "/api/resume/[id]/pdf": [
      "./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
    ],
  },
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
        { key: "X-XSS-Protection", value: "0" },
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
