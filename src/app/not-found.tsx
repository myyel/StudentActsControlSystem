import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

// Also shown for other users' resources (orNotFound), so the wording never hints that they exist.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <SearchX className="size-16 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="max-w-sm text-muted-foreground">Aradığınız sayfa yok ya da görüntüleme izniniz bulunmuyor.</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
