import { behaviorTone, formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";

type Props = {
  icon: string;
  name: string;
  points: number;
  /** kid: board (big, stars instead of numbers); adult: teacher/parent; negative: "gelişim alanı". */
  tone: "kid" | "adult" | "negative";
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

const STAR = "M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z";

/** One behavior button. The same behavior has the same colour and icon on every screen. */
export function BehaviorTile({ icon, name, points, tone, disabled, onClick, className }: Props) {
  const kid = tone === "kid";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-center transition-[transform,background-color] duration-100 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:translate-y-0.5 disabled:opacity-50 motion-reduce:active:translate-y-0",
        kid
          ? `tone-${behaviorTone(icon)} min-h-36 rounded-3xl bg-(--tile) p-3 shadow-[0_4px_0_var(--tile-edge)]`
          : tone === "adult"
            ? "min-h-20 rounded-2xl border border-grass/40 bg-grass-soft/60 p-2 hover:bg-grass-soft"
            : "min-h-20 rounded-2xl border border-coral/40 bg-coral-soft/50 p-2 hover:bg-coral-soft",
        className,
      )}
    >
      <span className={kid ? "text-[52px] leading-none" : "text-2xl"} aria-hidden>
        {icon}
      </span>
      <span className={cn("leading-tight font-bold", kid ? "text-xl" : "text-sm")}>{name}</span>
      {kid ? (
        // Points as stars, not numbers (children see the board).
        <span role="img" aria-label={`${points} yıldız`} className="flex gap-0.5">
          {Array.from({ length: Math.min(points, 3) }, (_, i) => (
            <svg key={i} viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path d={STAR} className="fill-sun stroke-sun-press" strokeWidth={1.5} strokeLinejoin="round" />
            </svg>
          ))}
        </span>
      ) : (
        <span className={cn("text-sm font-extrabold", tone === "adult" ? "text-grass-strong" : "text-coral-ink")}>
          {formatPoints(points)}
        </span>
      )}
    </button>
  );
}
