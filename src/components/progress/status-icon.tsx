import { cn } from "@/lib/utils";
import type { ProgressState } from "@/lib/progress";

const STAR = "M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z";

/** 0–3 stars as SVG (no glyph text, so nothing for contrast checks to trip on). */
export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn("flex gap-px", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-2.5">
          <path d={STAR} className="fill-sun stroke-sun-press" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Shape + colour per status, so the state reads without colour: dashed ring (not started),
 * half-filled circle (in progress), filled check (completed) with its stars underneath.
 */
export function StatusIcon({ state, className }: { state: ProgressState; className?: string }) {
  if (state.status === "not_started") {
    return (
      <svg viewBox="0 0 24 24" className={cn("size-6 text-muted-foreground", className)} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3.5 3" />
      </svg>
    );
  }
  if (state.status === "in_progress") {
    return (
      <svg viewBox="0 0 24 24" className={cn("size-6 text-sky-ink", className)} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <span className={cn("flex flex-col items-center gap-0.5 leading-none", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-6">
        <circle cx="12" cy="12" r="10.5" className="fill-grass-strong" />
        <path
          d="m7.5 12.5 3 3 6-6.5"
          fill="none"
          className="stroke-white dark:stroke-[#1b1c2a]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {state.stars ? <Stars count={state.stars} /> : null}
    </span>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm font-semibold" aria-hidden>
      <span className="flex items-center gap-1">
        <StatusIcon state={{ status: "not_started", stars: null }} className="size-5" /> Başlamadı
      </span>
      <span className="flex items-center gap-1">
        <StatusIcon state={{ status: "in_progress", stars: null }} className="size-5" /> Devam ediyor
      </span>
      <span className="flex items-center gap-1">
        <StatusIcon state={{ status: "completed", stars: null }} /> Tamamlandı
      </span>
    </div>
  );
}
