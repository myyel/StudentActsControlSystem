import { ChevronLeft, ChevronRight, House, School, Sprout, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { BehaviorWeekCard } from "@/components/parents/behavior-week-card";
import { DragScrollRow } from "@/components/parents/drag-scroll-row";
import { WeekChart } from "@/components/timeline/week-chart";
import { cn } from "@/lib/utils";
import type { BehaviorSourceWeek, BehaviorWeek, BehaviorWeekRow } from "@/server/services/behavior-week";

const shortDate = (day: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

const card = "rounded-[1.75rem] bg-card shadow-[0_6px_0_var(--kid-shadow)]";
const navButton =
  "flex min-h-11 items-center gap-1 rounded-full bg-card px-4 text-sm font-bold shadow-[0_3px_0_var(--kid-shadow)] hover:bg-accent";

type BehaviorCardsProps = { label: string; behaviors: BehaviorWeekRow[]; days: string[]; today?: string };

function BehaviorCards({ label, behaviors, days, today }: BehaviorCardsProps) {
  return (
    <DragScrollRow label={label}>
      {behaviors.map((b) => (
        <li key={`${b.icon}${b.name}`} className="w-72 max-w-[85%] shrink-0 snap-start sm:w-80">
          <BehaviorWeekCard behavior={b} days={days} highlight={today} />
        </li>
      ))}
    </DragScrollRow>
  );
}

type SourceSectionProps = {
  source: "school" | "home";
  week: BehaviorSourceWeek;
  days: string[];
  today?: string;
  negativeNote: string;
};

/** One source's week: its own summary chart, then a card per behavior. */
function SourceSection({ source, week, days, today, negativeNote }: SourceSectionProps) {
  const { summary, positives, negatives } = week;
  const home = source === "home";
  const Icon = home ? House : School;
  const total = summary.reduce((s, d) => s + d.positive - d.negative, 0);
  const empty = positives.length === 0 && negatives.length === 0;

  return (
    <section aria-labelledby={`${source}-title`} className="flex flex-col gap-4">
      <h2 id={`${source}-title`} className="flex items-center gap-2 font-display text-2xl font-extrabold">
        <Icon aria-hidden className="size-6 text-sky-ink" />
        {home ? "Evde" : "Okulda"}
      </h2>

      {empty ? (
        <div className={cn(card, "flex flex-col items-center gap-2 p-8 text-center")}>
          <span aria-hidden className="text-5xl">
            🌱
          </span>
          <p className="font-display text-xl font-extrabold">
            Bu dönemde {home ? "evde" : "okulda"} kayıtlı davranış yok.
          </p>
        </div>
      ) : (
        <>
          <div className={cn(card, "flex flex-col gap-4 p-4 sm:p-6")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-extrabold">Haftanın özeti</h3>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-extrabold",
                  total >= 0 ? "bg-grass-soft text-grass-strong" : "bg-coral-soft text-coral-ink",
                )}
              >
                {home ? "Toplam" : "Denge"}: {total > 0 ? "+" : ""}
                {total}
              </span>
            </div>
            <WeekChart days={summary} positiveOnly={home} />
          </div>

          {positives.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 font-display text-xl font-extrabold">
                <ThumbsUp aria-hidden className="size-5 text-grass-strong" />
                Olumlu davranışlar
              </h3>
              <BehaviorCards
                label={`${home ? "Evde" : "Okulda"} olumlu davranışlar`}
                behaviors={positives}
                days={days}
                today={today}
              />
            </div>
          )}
          {negatives.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="flex items-center gap-2 font-display text-xl font-extrabold">
                  <Sprout aria-hidden className="size-5 text-coral-ink" />
                  Gelişim alanı
                </h3>
                <p className="text-sm text-muted-foreground">{negativeNote}</p>
              </div>
              <BehaviorCards label="Gelişim alanı" behaviors={negatives} days={days} today={today} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

type Props = {
  week: BehaviorWeek;
  /** The page's own path; `?hafta=N` is added for other weeks. */
  baseHref: string;
  /** Who sees the negative behaviors, shown under "Gelişim alanı". */
  negativeNote: string;
};

/** A student's week, school and home apart, with week-by-week paging. Shared by the parent and teacher pages. */
export function BehaviorWeekView({ week, baseHref, negativeNote }: Props) {
  const { days, weekOffset } = week;
  const weekHref = (offset: number) => (offset === 0 ? baseHref : `${baseHref}?hafta=${offset}`);
  const today = weekOffset === 0 ? days[6] : undefined;
  const title = weekOffset === 0 ? "Son 7 gün" : weekOffset === 1 ? "Önceki hafta" : `${weekOffset} hafta önce`;

  return (
    <>
      <nav aria-label="Hafta seçimi" className="flex flex-wrap items-center justify-between gap-3">
        {week.hasOlder ? (
          <Link href={weekHref(weekOffset + 1)} className={navButton}>
            <ChevronLeft aria-hidden className="size-4" />
            Önceki hafta
          </Link>
        ) : (
          <span />
        )}
        <p className="text-center font-display text-lg font-extrabold">
          {title}
          <span className="block text-sm font-normal text-muted-foreground">
            {shortDate(week.from)} – {shortDate(week.to)} {week.to.slice(0, 4)}
          </span>
        </p>
        {weekOffset > 0 ? (
          <Link href={weekHref(weekOffset - 1)} className={navButton}>
            Sonraki hafta
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <SourceSection source="school" week={week.school} days={days} today={today} negativeNote={negativeNote} />
      <SourceSection source="home" week={week.home} days={days} today={today} negativeNote={negativeNote} />
    </>
  );
}
