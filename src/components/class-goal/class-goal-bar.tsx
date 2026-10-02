import { cn } from "@/lib/utils";

type Props = { title: string; value: number; target: number; large?: boolean; className?: string };

// Small joys along the way: a stop every quarter.
const MILESTONES = [
  { at: 0.25, icon: "🌱" },
  { at: 0.5, icon: "🌿" },
  { at: 0.75, icon: "🌷" },
];

/** The class's shared goal: everyone fills it together; no names, no per-child numbers. */
export function ClassGoalBar({ title, value, target, large, className }: Props) {
  const shown = Math.min(value, target);
  const ratio = target > 0 ? shown / target : 0;
  const done = value >= target;

  return (
    <div className={cn("flex items-center gap-3 rounded-3xl bg-card px-4 py-2 shadow-[0_4px_0_var(--kid-shadow)]", className)}>
      <span className={large ? "text-4xl" : "text-2xl"} aria-hidden>
        {done ? "🎉" : "🌻"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn("truncate font-bold", large ? "text-lg" : "text-sm")}>
            {done ? `Hedefe ulaştık: ${title}!` : `Sınıf hedefi: ${title}`}
          </span>
          <span className={cn("font-extrabold whitespace-nowrap text-grass-strong", large ? "text-lg" : "text-sm")}>
            {shown} / {target}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Sınıf hedefi: ${title}`}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={shown}
          className={cn("relative w-full rounded-full bg-muted", large ? "h-4" : "h-3")}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-grass/70 to-grass transition-[width] duration-600 ease-out motion-reduce:transition-none"
            style={{ width: `${ratio * 100}%` }}
          />
          {MILESTONES.map((m) => (
            <span
              key={m.at}
              aria-hidden
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none",
                large ? "text-lg" : "text-sm",
                ratio < m.at && "opacity-40 grayscale",
              )}
              style={{ left: `${m.at * 100}%` }}
            >
              {m.icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
