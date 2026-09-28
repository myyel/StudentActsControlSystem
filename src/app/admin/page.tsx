import Link from "next/link";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { countPendingDeletionRequests } from "@/server/services/privacy";

const cardClass = "flex min-h-11 flex-col gap-1 rounded-xl border p-4 hover:bg-accent";

export default async function AdminHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("admin");
  const pending = user.schoolId ? await countPendingDeletionRequests(db, user.schoolId) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Yönetim paneli</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link href="/admin/karakterler" className={cardClass}>
            <span className="font-semibold">Karakterler</span>
            <span className="text-sm text-muted-foreground">Seviye eşikleri, karakter türleri ve evrim aşamaları</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/silme-talepleri" className={cardClass}>
            <span className="flex items-center gap-2 font-semibold">
              Silme talepleri
              {pending > 0 && (
                <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs text-white">{pending} bekliyor</span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">Velilerin KVKK silme talepleri ve öğrenci verisi dışa aktarma</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/denetim" className={cardClass}>
            <span className="font-semibold">Denetim kaydı</span>
            <span className="text-sm text-muted-foreground">Kritik işlemlerin kim tarafından, ne zaman yapıldığı</span>
          </Link>
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Öğretmen ve yönetici hesapları şimdilik sunucuda komutla oluşturulur (docs/DEPLOY.md).
      </p>
    </div>
  );
}
