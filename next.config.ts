import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e builds into their own folder so they do not clobber the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Self-contained server for the production Docker image (Dockerfile).
  output: "standalone",
  async headers() {
    return [
      {
        // HSTS is set by Caddy (deploy/Caddyfile), which terminates HTTPS.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        // Browsers must always see the latest service worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
