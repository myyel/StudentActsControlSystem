import { Presentation } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "puanlama", label: "Puanlama", href: (id: string) => `/ogretmen/siniflar/${id}` },
  { key: "matris", label: "Matris", href: (id: string) => `/ogretmen/siniflar/${id}/matris` },
  { key: "davranislar", label: "Davranışlar", href: (id: string) => `/ogretmen/siniflar/${id}/davranislar` },
  { key: "duraklar", label: "Duraklar", href: (id: string) => `/ogretmen/siniflar/${id}/duraklar` },
  { key: "mesajlar", label: "Mesajlar", href: (id: string) => `/ogretmen/siniflar/${id}/mesajlar` },
  { key: "davetler", label: "Veli davet kartları", href: (id: string) => `/ogretmen/siniflar/${id}/davetler` },
] as const;

export type ClassTab = (typeof TABS)[number]["key"];

export function ClassNav({ classId, className, active }: { classId: string; className: string; active: ClassTab }) {
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <BackLink href="/ogretmen">Sınıflarım</BackLink>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{className}</h1>
        <Link
          href={`/tahta/${classId}`}
          className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          <Presentation className="size-4" aria-hidden />
          Tahta modu
        </Link>
      </div>
      <nav aria-label="Sınıf menüsü" className="-mx-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href(classId)}
            aria-current={tab.key === active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium transition-colors",
              tab.key === active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
