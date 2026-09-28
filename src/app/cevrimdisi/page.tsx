import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Bağlantı yok" };

// Static page the service worker stores at install and shows when a page cannot load offline.
// Keep it free of user data: it is served to whoever opens the app on this device.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-16 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold">İnternet bağlantısı yok</h1>
      <p className="max-w-sm text-muted-foreground">
        Bu sayfa şu anda açılamıyor. Bağlantınız geri geldiğinde tekrar deneyin; verdiğiniz puanlar ve
        mesajlar ancak bağlantı varken kaydedilir.
      </p>
      <RetryButton />
    </main>
  );
}
