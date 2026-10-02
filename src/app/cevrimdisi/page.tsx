import type { Metadata } from "next";
import { CharacterMessage } from "@/components/layout/character-message";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Bağlantı yok" };

// Static page the service worker stores at install and shows when a page cannot load offline.
// Keep it free of user data: it is served to whoever opens the app on this device.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <CharacterMessage
        character={["robot", 2]}
        title="İnternet uykuya daldı"
        action={<RetryButton />}
        extra={
          <span aria-hidden className="absolute -top-1 right-0 font-display text-2xl font-extrabold text-sky-ink">
            z z z
          </span>
        }
      >
        Bağlantı gelince tekrar dene. Puanlar ve mesajlar yalnızca bağlantı varken kaydedilir.
      </CharacterMessage>
    </main>
  );
}
