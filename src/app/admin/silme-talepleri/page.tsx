import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Download, FileSpreadsheet, Inbox, UserRound, XCircle } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SECTIONS, adminCardClass } from "@/components/admin/admin-sections";
import { DeletionRequestActions } from "@/components/privacy/deletion-request-actions";
import { buttonVariants } from "@/components/ui/button";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listDeletionRequests } from "@/server/services/privacy";

export const metadata: Metadata = { title: "Silme talepleri" };

const TABS = [
  { status: "pending", label: "Bekleyen", icon: CalendarClock, band: "bg-sun-soft" },
  { status: "completed", label: "Silinen", icon: CheckCircle2, band: "bg-grass-soft" },
  { status: "rejected", label: "Reddedilen", icon: XCircle, band: "bg-muted" },
] as const;

const formatDate = (d: Date) => d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });

export default async function DeletionRequestsPage({ searchParams }: PageProps<"/admin/silme-talepleri">) {
  const { user } = await requirePageRole("admin");
  const { durum } = await searchParams;
  const active = TABS.find((t) => t.status === durum) ?? TABS[0];
  const requests = user.schoolId ? await listDeletionRequests(db, user.schoolId, active.status) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminPageHeader section={ADMIN_SECTIONS.deletions}>
        Veliler çocuklarının verilerinin silinmesini buradan ister (KVKK). Silmeden önce verileri indirip veliye
        iletebilirsiniz.
      </AdminPageHeader>

      <nav aria-label="Talep durumu" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/silme-talepleri?durum=${t.status}`}
            aria-current={t === active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
              t === active
                ? "bg-primary text-primary-foreground shadow-[0_3px_0_rgb(0_0_0/0.15)]"
                : "bg-card shadow-[0_3px_0_var(--kid-shadow)] hover:bg-accent",
            )}
          >
            <t.icon aria-hidden className="size-4" />
            {t.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <div className={cn(adminCardClass, "flex flex-col items-center gap-2 p-8 text-center")}>
          <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-sky-soft text-sky-ink">
            <Inbox className="size-7" />
          </span>
          <p className="font-display text-xl font-extrabold">Bu durumda talep yok.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {requests.map((r) => (
            <li key={r.id} className={cn(adminCardClass, "overflow-hidden")}>
              <div className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6", active.band)}>
                <h2 className="font-display text-xl font-extrabold">
                  {r.firstName
                    ? `${formatStudentName({ firstName: r.firstName, lastInitial: r.lastInitial })} · ${r.className}`
                    : "Silinmiş öğrenci"}
                </h2>
                <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-bold">
                  <active.icon aria-hidden className="size-3.5" />
                  {active.label}
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4 text-sm sm:px-6">
                <p className="flex items-start gap-2">
                  <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-ink" />
                  <span className="break-words">
                    Talep eden:{" "}
                    {r.requestedByName ? `${r.requestedByName} (${r.requestedByEmail})` : "silinmiş veli hesabı"} ·{" "}
                    {formatDate(r.createdAt)}
                  </span>
                </p>
                {r.note && <p className="rounded-2xl bg-muted p-3">“{r.note}”</p>}
                {r.resolvedAt && <p>Sonuçlandı: {formatDate(r.resolvedAt)}</p>}
                {r.rejectReason && <p>Gerekçe: {r.rejectReason}</p>}
                {r.status === "pending" && r.studentId && r.firstName && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/admin/ogrenciler/${r.studentId}/disa-aktar?bicim=json`}
                        className={cn(buttonVariants({ variant: "outline" }), "h-11")}
                      >
                        <Download aria-hidden />
                        Verileri indir (JSON)
                      </a>
                      <a
                        href={`/admin/ogrenciler/${r.studentId}/disa-aktar?bicim=csv`}
                        className={cn(buttonVariants({ variant: "outline" }), "h-11")}
                      >
                        <FileSpreadsheet aria-hidden />
                        Davranış geçmişi (CSV)
                      </a>
                    </div>
                    <DeletionRequestActions requestId={r.id} firstName={r.firstName} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
