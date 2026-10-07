import type { MetadataRoute } from "next";

// Installable PWA; iOS delivers Web Push only to home-screen apps. The service worker
// (public/sw.js) shows /cevrimdisi when a page cannot load offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Öğrenci Davranış ve Gelişim Sistemi",
    short_name: "Gelişim",
    description: "Öğretmen ve veliler için davranış ve gelişim takibi",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    categories: ["education"],
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      // The mark sits inside the central 80% safe zone (AppIconArt), so the same art is maskable.
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
