import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { ADMIN_SECTIONS, adminCardClass } from "@/components/admin/admin-sections";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { countPendingDeletionRequests } from "@/server/services/privacy";

export default async function AdminHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("admin");
  const pending = user.schoolId ? await countPendingDeletionRequests(db, user.schoolId) : 0;

  const tiles = [
    { section: ADMIN_SECTIONS.characters },
    { section: ADMIN_SECTIONS.deletions, badge: pending > 0 ? `${pending} bekliyor` : undefined },
    { section: ADMIN_SECTIONS.audit },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Yönetim paneli</h1>
        <p className="text-muted-foreground">Merhaba, {user.name}! Okulunuzun ayarlarını ve kayıtlarını buradan yönetin.</p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ section: { href, title, description, icon: Icon, tone }, badge }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                adminCardClass,
                "group flex h-full flex-col overflow-hidden outline-none transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring",
              )}
            >
              <div className={cn("flex items-center gap-4 p-4", tone.band)}>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-[0_3px_0_rgb(0_0_0/0.12)]",
                    tone.badge,
                  )}
                >
                  <Icon className="size-8" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <h2 className="font-display text-2xl font-extrabold leading-tight">{title}</h2>
                  {badge && (
                    <span className="rounded-full bg-coral-ink px-2.5 py-0.5 text-xs font-bold text-white">{badge}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 p-4">
                <p className="flex-1 text-muted-foreground">{description}</p>
                <ChevronRight
                  aria-hidden
                  className="size-6 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-input bg-card/60 p-4 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-sky-ink" />
        Öğretmen ve yönetici hesapları şimdilik sunucuda komutla oluşturulur (docs/DEPLOY.md).
      </p>
    </div>
  );
}
