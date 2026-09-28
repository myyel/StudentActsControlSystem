import type { Metadata } from "next";
import Link from "next/link";
import { selectClassName } from "@/components/form-message";
import { BackLink } from "@/components/layout/back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUDIT_ACTION_LABEL, auditActionLabel } from "@/lib/audit-labels";
import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listAuditLog } from "@/server/services/audit";
import { auditFilterSchema } from "@/server/validation/privacy";

export const metadata: Metadata = { title: "Denetim kaydı" };

/** Start of a calendar day in Istanbul (UTC+3, no DST since 2016) as an instant. */
const istanbulDay = (day: string, offsetDays = 0) => new Date(Date.parse(`${day}T00:00:00+03:00`) + offsetDays * 86_400_000);

const formatDate = (d: Date) =>
  d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "medium" });

export default async function AuditPage({ searchParams }: PageProps<"/admin/denetim">) {
  const { user } = await requirePageRole("admin");
  const filters = auditFilterSchema.parse(await searchParams);
  const result = user.schoolId
    ? await listAuditLog(db, user.schoolId, {
        action: filters.islem || undefined,
        actor: filters.kisi || undefined,
        from: filters.baslangic ? istanbulDay(filters.baslangic) : undefined,
        to: filters.bitis ? istanbulDay(filters.bitis, 1) : undefined,
        page: filters.sayfa,
      })
    : { rows: [], hasNext: false, page: 1 };

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, sayfa: page })) if (value) params.set(key, String(value));
    return `/admin/denetim?${params}`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <BackLink href="/admin">Yönetim paneli</BackLink>
      <h1 className="text-2xl font-semibold">Denetim kaydı</h1>
      <p className="text-sm text-muted-foreground">
        Puan verme/silme, ilerleme, veli bağlama, silme ve dışa aktarma gibi kritik işlemler. Kayıtlar değiştirilemez;
        silinen öğrencilerin adları kayıtlardan çıkarılır.
      </p>

      <form className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="flex flex-col gap-2 lg:col-span-2">
          <Label htmlFor="islem">İşlem</Label>
          <select id="islem" name="islem" defaultValue={filters.islem ?? ""} className={selectClassName}>
            <option value="">Tümü</option>
            {Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="kisi">Kişi (ad veya e-posta)</Label>
          <Input id="kisi" name="kisi" defaultValue={filters.kisi ?? ""} className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="baslangic">Başlangıç</Label>
          <Input id="baslangic" name="baslangic" type="date" defaultValue={filters.baslangic ?? ""} className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bitis">Bitiş</Label>
          <Input id="bitis" name="bitis" type="date" defaultValue={filters.bitis ?? ""} className="h-11" />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" className="h-11">
            Filtrele
          </Button>
          <Link href="/admin/denetim" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Temizle
          </Link>
        </div>
      </form>

      {result.rows.length === 0 ? (
        <p className="text-muted-foreground">Kayıt bulunamadı.</p>
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border">
          {result.rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{auditActionLabel(r.action)}</span>
                <time dateTime={r.createdAt.toISOString()} className="text-sm text-muted-foreground">
                  {formatDate(r.createdAt)}
                </time>
              </div>
              <p className="text-sm break-words">
                {r.actorName && r.actorRole
                  ? `${r.actorName} (${ROLE_LABEL[r.actorRole]}, ${r.actorEmail})`
                  : "Silinmiş kullanıcı veya sistem"}
                {r.ip && <span className="text-muted-foreground"> · IP {r.ip}</span>}
              </p>
              <details className="text-sm">
                <summary className="inline-flex min-h-11 min-w-11 cursor-pointer items-center text-muted-foreground">Ayrıntı</summary>
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify({ kayit: `${r.entity}/${r.entityId}`, ...r.data }, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="Sayfalar" className="flex flex-wrap items-center gap-2">
        {result.page > 1 && (
          <Link href={pageHref(result.page - 1)} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            ← Daha yeni
          </Link>
        )}
        <span className="text-sm text-muted-foreground">Sayfa {result.page}</span>
        {result.hasNext && (
          <Link href={pageHref(result.page + 1)} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Daha eski →
          </Link>
        )}
      </nav>
    </div>
  );
}
