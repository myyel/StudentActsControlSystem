import { weekday } from "@/components/timeline/week-chart";
import { behaviorTone, formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import type { BehaviorWeekRow } from "@/server/services/behavior-week";

type Props = {
  behavior: BehaviorWeekRow;
  days: string[];
  /** Bolds this day's label, e.g. today. */
  highlight?: string;
};

/** One behavior's week: how many times per day, as small bars. Plain HTML so it needs no chart library. */
export function BehaviorWeekCard({ behavior, days, highlight }: Props) {
  const { name, icon, positive, perDay, count, points } = behavior;
  const max = Math.max(1, ...perDay);
  const summary = days.map((d, i) => `${weekday(d)} ${perDay[i]}`).join(", ");

  return (
    <article className="flex h-full flex-col gap-4 rounded-[1.75rem] bg-card p-4 shadow-[0_6px_0_var(--kid-shadow)] sm:p-5">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            `tone-${behaviorTone(icon)}`,
            "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-(--tile) text-2xl shadow-[0_3px_0_var(--tile-edge)]",
          )}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="font-display text-lg leading-tight font-extrabold break-words">{name}</h4>
          <p className="text-sm text-muted-foreground">Bu dönemde {count} kez</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-sm font-extrabold",
            positive ? "bg-grass-soft text-grass-strong" : "bg-coral-soft text-coral-ink",
          )}
        >
          {formatPoints(points)}
        </span>
      </header>

      <figure className="flex flex-col gap-1">
        <div className="flex h-24 items-end gap-1.5" aria-hidden>
          {days.map((d, i) => {
            const n = perDay[i]!;
            return (
              <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1 pt-1">
                {n > 0 && <span className="text-xs font-bold">{n}</span>}
                <div
                  className={cn(
                    "w-full max-w-7 rounded-t-md",
                    n === 0 ? "h-1 bg-muted" : positive ? "bg-grass" : "bar-negative",
                  )}
                  style={n > 0 ? { height: `${(n / max) * 70}%` } : undefined}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {days.map((d) => (
            <span key={d} className={cn("flex-1 text-center text-xs text-muted-foreground", d === highlight && "font-bold text-ink")}>
              {weekday(d)}
            </span>
          ))}
        </div>
        <figcaption className="sr-only">
          {name}, gün gün kaç kez: {summary}
        </figcaption>
      </figure>
    </article>
  );
}
