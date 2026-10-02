import { Grid3x3, Mail, Map, Presentation, Star, Tag, Ticket } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listClassesForTeacher } from "@/server/services/class";
import { ClassSwitcher } from "./class-switcher";

const TABS = [
  { key: "puanlama", label: "Puanlama", icon: Star, path: "" },
  { key: "matris", label: "Matris", icon: Grid3x3, path: "/matris" },
  { key: "davranislar", label: "Davranışlar", icon: Tag, path: "/davranislar" },
  { key: "duraklar", label: "Duraklar", icon: Map, path: "/duraklar" },
  { key: "mesajlar", label: "Mesajlar", icon: Mail, path: "/mesajlar" },
  { key: "davetler", label: "Veli davet kartları", icon: Ticket, path: "/davetler" },
] as const;

export type ClassTab = (typeof TABS)[number]["key"];

/** Class header: switch between the teacher's classes without going back, tabs, board mode. */
export async function ClassNav({ classId, className, active }: { classId: string; className: string; active: ClassTab }) {
  const { user } = await requirePageRole("teacher");
  const classes = await listClassesForTeacher(db, user.id);
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <BackLink href="/ogretmen">Sınıflarım</BackLink>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl font-extrabold">{className}</h1>
          {classes.length > 1 && (
            <ClassSwitcher
              currentId={classId}
              tabPath={tab.path}
              classes={classes.map(({ id, name }) => ({ id, name }))}
            />
          )}
        </div>
        <Link
          href={`/tahta/${classId}`}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-sun px-4 text-sm font-extrabold text-ink shadow-[0_2px_0_var(--sun-press)] hover:bg-sun-press/80"
        >
          <Presentation className="size-4" aria-hidden />
          Tahta modu
        </Link>
      </div>
      <nav aria-label="Sınıf menüsü" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map(({ key, label, icon: Icon, path }) => (
          <Link
            key={key}
            href={`/ogretmen/siniflar/${classId}${path}`}
            aria-current={key === active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
              key === active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
