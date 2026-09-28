"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  // The service worker served this page in place of the one the user opened, so a reload
  // retries that page (not /cevrimdisi) once the network is back.
  return (
    <Button className="h-11 px-6" onClick={() => window.location.reload()}>
      Tekrar dene
    </Button>
  );
}
