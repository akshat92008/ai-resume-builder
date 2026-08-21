import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
  transpilePackages: ["motion"],
  // pdf-parse's documented Next.js/Vercel setup keeps both the parser and its
  // native canvas runtime external. The parser itself is bootstrapped through
  // `pdf-parse/worker`, which embeds the PDF.js worker as a data URL and avoids
  // depending on a separately traced pdf.worker.mjs file inside the lambda.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
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
