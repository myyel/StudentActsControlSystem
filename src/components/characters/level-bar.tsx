import { MAX_LEVEL } from "@/lib/character";
import { cn } from "@/lib/utils";

type Props = { level: number; progress: number; className?: string; label?: string };

/** Progress to the next level; the last level shows a full bar. No numbers, so nothing to compare. */
export function LevelBar({ level, progress, className, label }: Props) {
  const percent = Math.round(progress * 100);
  const text = level >= MAX_LEVEL ? "Son seviye" : `${level + 1}. seviyeye %${percent}`;
  return (
    <div
      role="progressbar"
      aria-label={label ?? text}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-3 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-grass transition-[width] duration-700 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
