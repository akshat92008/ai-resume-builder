import type { NextConfig } from "next";

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
