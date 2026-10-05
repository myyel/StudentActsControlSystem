import { AlarmClock, Grid3x3, Mail, Map, Presentation, Sparkles, Star, Tag, Ticket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listClassesForTeacher } from "@/server/services/class";
import { ClassSwitcher } from "./class-switcher";

const TABS = [
  { key: "puanlama", label: "Puanlama", icon: Star, path: "" },
  { key: "matris", label: "Ölçek", icon: Grid3x3, path: "/matris" },
  { key: "davranislar", label: "Davranışlar", short: "Davranış", icon: Tag, path: "/davranislar" },
  { key: "karakterler", label: "Karakterler", short: "Karakter", icon: Sparkles, path: "/karakterler" },
  { key: "etkinlik", label: "Etkinlik saati", short: "Etkinlik", icon: AlarmClock, path: "/etkinlik" },
  { key: "duraklar", label: "Duraklar", icon: Map, path: "/duraklar" },
  { key: "mesajlar", label: "Mesajlar", icon: Mail, path: "/mesajlar" },
  { key: "davetler", label: "Veli davet kartları", short: "Davetler", icon: Ticket, path: "/davetler" },
] as const;

export type ClassTab = (typeof TABS)[number]["key"];

/**
 * Class header: switch between the teacher's classes without going back, tabs, board mode.
 * "Sınıflarım" lives in the header (TeacherNav). Phones get a 4×2 tab grid instead of a hidden scroll.
 */
export async function ClassNav({ classId, className, active }: { classId: string; className: string; active: ClassTab }) {
  const { user } = await requirePageRole("teacher");
  const classes = await listClassesForTeacher(db, user.id);
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 font-display text-3xl font-extrabold break-words">{className}</h1>
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
      {/* One white bar holding every tab; the current tab is the dark pill inside it. */}
      <nav
        aria-label="Sınıf menüsü"
        className="grid grid-cols-4 gap-1 rounded-3xl border bg-card p-1.5 shadow-[0_4px_0_var(--kid-shadow)] sm:flex sm:w-fit sm:max-w-full sm:flex-wrap sm:rounded-full"
      >
        {TABS.map((t) => {
          const { key, label, icon: Icon, path } = t;
          const current = key === active;
          return (
            <Link
              key={key}
              href={`/ogretmen/siniflar/${classId}${path}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-bold transition-colors",
                "sm:min-h-11 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-4 sm:text-sm",
                current ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-5 sm:size-4" aria-hidden />
              {"short" in t ? (
                <>
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
