import Link from "next/link";
import { requirePageRole } from "@/server/auth/session";

export default async function AdminHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  await requirePageRole("admin");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Yönetim paneli</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link href="/admin/karakterler" className="flex min-h-11 flex-col gap-1 rounded-xl border p-4 hover:bg-accent">
            <span className="font-semibold">Karakterler</span>
            <span className="text-sm text-muted-foreground">Seviye eşikleri, karakter türleri ve evrim aşamaları</span>
          </Link>
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">Okul ayarları ve öğretmen hesapları sonraki fazlarda eklenecek.</p>
    </div>
  );
}
