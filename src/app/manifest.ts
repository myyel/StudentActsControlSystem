import type { MetadataRoute } from "next";

// Minimal manifest so the app can be added to the home screen; iOS delivers Web Push only to
// home-screen apps. Phase 8 completes the PWA (offline, screenshots).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Öğrenci Davranış ve Gelişim Sistemi",
    short_name: "Gelişim",
    description: "Öğretmen ve veliler için davranış ve gelişim takibi",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
