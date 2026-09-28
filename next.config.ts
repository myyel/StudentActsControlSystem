import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e builds into their own folder so they do not clobber the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
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
