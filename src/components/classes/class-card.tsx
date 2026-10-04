import { Mail, Presentation, Star, Users } from "lucide-react";
import Link from "next/link";
import { formatGradeLevels } from "@/lib/grade-levels";
import { cn } from "@/lib/utils";

const TONES = [
  { badge: "bg-grass", band: "bg-grass-soft" },
  { badge: "bg-sky", band: "bg-sky-soft" },
  { badge: "bg-sun", band: "bg-sun-soft" },
  { badge: "bg-lav", band: "bg-lav-soft" },
] as const;

type Props = {
  cls: { id: string; name: string; gradeLevels: number[]; academicYear: string; studentCount: number; withParentCount: number };
  /** Position in the list; picks the colour so neighbouring classes look different. */
  index: number;
};

/** Short names ("2-A") fit the badge; longer ones show the levels instead ("1-2-3"). */
const badgeText = ({ name, gradeLevels }: { name: string; gradeLevels: number[] }) =>
  name.length <= 4 ? name : gradeLevels.join("-");

/** A class on the teacher's home: the whole card opens scoring, with shortcuts to the board and messages. */
export function ClassCard({ cls, index }: Props) {
  const tone = TONES[index % TONES.length]!;
  const base = `/ogretmen/siniflar/${cls.id}`;
  const linked = cls.studentCount > 0 ? Math.round((cls.withParentCount / cls.studentCount) * 100) : 0;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-card shadow-[0_6px_0_var(--kid-shadow)] transition-transform has-[a[data-main]:hover]:-translate-y-0.5 has-[a[data-main]:focus-visible]:outline-2 has-[a[data-main]:focus-visible]:outline-ring">
      <div className={cn("flex items-center gap-4 p-4", tone.band)}>
        <span
          aria-hidden
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-extrabold text-ink shadow-[0_3px_0_rgb(0_0_0/0.12)]",
            tone.badge,
          )}
        >
          {badgeText(cls)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-extrabold">{cls.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatGradeLevels(cls.gradeLevels)} · {cls.academicYear}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="flex items-center gap-2 font-bold">
          <Users className="size-5 text-sky-ink" aria-hidden />
          {cls.studentCount} öğrenci
        </p>
        <div className="flex flex-col gap-1.5">
          <p className="flex justify-between text-sm">
            <span>Velisi bağlı</span>
            <span className="font-bold">
              {cls.withParentCount}/{cls.studentCount}
            </span>
          </p>
          <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-grass" style={{ width: `${linked}%` }} />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={base}
            data-main
            aria-label={`${cls.name}: Puanla`}
            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground outline-none after:absolute after:inset-0 after:content-[''] hover:bg-primary/90"
          >
            <Star className="size-4" aria-hidden />
            Puanla
          </Link>
          <Link
            href={`/tahta/${cls.id}`}
            aria-label={`${cls.name}: Tahta modu`}
            className="relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sun px-3 text-sm font-extrabold text-ink shadow-[0_2px_0_var(--sun-press)] hover:bg-sun-press/80"
          >
            <Presentation className="size-4" aria-hidden />
            Tahta
          </Link>
          <Link
            href={`${base}/mesajlar`}
            aria-label={`${cls.name}: Mesajlar`}
            className="relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-bold hover:bg-accent"
          >
            <Mail className="size-4" aria-hidden />
            Mesajlar
          </Link>
        </div>
      </div>
    </article>
  );
}
