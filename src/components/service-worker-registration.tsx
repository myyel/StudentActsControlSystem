"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

/** Installs the service worker on first visit so the offline screen works without push. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) registerServiceWorker().catch(() => {});
  }, []);
  return null;
}
