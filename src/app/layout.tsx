import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

// Rounded, child-friendly faces with full Turkish support; self-hosted by next/font.
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin", "latin-ext"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: "Öğrenci Davranış ve Gelişim Sistemi",
  description: "Öğretmen ve veliler için davranış ve gelişim takibi",
  // Home-screen app on iOS (required there for Web Push).
  appleWebApp: { capable: true, title: "Gelişim", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
  // Light only, even when the OS prefers dark. "only" also opts out of the forced darkening some
  // Android browsers apply to light pages (Chrome's auto dark theme, Samsung Internet).
  colorScheme: "only light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${nunito.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
