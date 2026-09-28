import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { DeletionRequestActions } from "@/components/privacy/deletion-request-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listDeletionRequests } from "@/server/services/privacy";

export const metadata: Metadata = { title: "Silme talepleri" };

const TABS = [
  { status: "pending", label: "Bekleyen" },
  { status: "completed", label: "Silinen" },
  { status: "rejected", label: "Reddedilen" },
] as const;

const formatDate = (d: Date) => d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });

export default async function DeletionRequestsPage({ searchParams }: PageProps<"/admin/silme-talepleri">) {
  const { user } = await requirePageRole("admin");
  const { durum } = await searchParams;
  const active = TABS.find((t) => t.status === durum) ?? TABS[0];
  const requests = user.schoolId ? await listDeletionRequests(db, user.schoolId, active.status) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <BackLink href="/admin">Yönetim paneli</BackLink>
      <h1 className="text-2xl font-semibold">Silme talepleri</h1>
      <p className="text-sm text-muted-foreground">
        Veliler çocuklarının verilerinin silinmesini buradan ister (KVKK). Silmeden önce verileri indirip veliye
        iletebilirsiniz.
      </p>
      <nav aria-label="Talep durumu" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/silme-talepleri?durum=${t.status}`}
            aria-current={t === active ? "page" : undefined}
            className={cn(buttonVariants({ variant: t === active ? "default" : "outline" }), "h-11")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">Bu durumda talep yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {r.firstName ? `${formatStudentName({ firstName: r.firstName, lastInitial: r.lastInitial })} · ${r.className}` : "Silinmiş öğrenci"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <p>
                    Talep eden: {r.requestedByName ? `${r.requestedByName} (${r.requestedByEmail})` : "silinmiş veli hesabı"} ·{" "}
                    {formatDate(r.createdAt)}
                  </p>
                  {r.note && <p className="rounded-md bg-muted p-2">“{r.note}”</p>}
                  {r.resolvedAt && <p>Sonuçlandı: {formatDate(r.resolvedAt)}</p>}
                  {r.rejectReason && <p>Gerekçe: {r.rejectReason}</p>}
                  {r.status === "pending" && r.studentId && r.firstName && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <a href={`/admin/ogrenciler/${r.studentId}/disa-aktar?bicim=json`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                          Verileri indir (JSON)
                        </a>
                        <a href={`/admin/ogrenciler/${r.studentId}/disa-aktar?bicim=csv`} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                          Davranış geçmişi (CSV)
                        </a>
                      </div>
                      <DeletionRequestActions requestId={r.id} firstName={r.firstName} />
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
