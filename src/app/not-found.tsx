import type { Metadata } from "next";
import Link from "next/link";
import { CharacterMessage, primaryAction } from "@/components/layout/character-message";

export const metadata: Metadata = { title: "Bu sayfayı bulamadık" };

// Also shown for other users' resources (orNotFound), so the wording never hints that they exist.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <CharacterMessage
        character={["baykus", 4]}
        title="Bu sayfayı bulamadık"
        action={
          <Link href="/" className={primaryAction}>
            Ana sayfaya dön
          </Link>
        }
      >
        Sayfa yok ya da görme izniniz bulunmuyor.
      </CharacterMessage>
    </main>
  );
}
