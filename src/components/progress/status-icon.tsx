import { cn } from "@/lib/utils";
import type { ProgressState } from "@/lib/progress";

/** Shape + colour per status, so the state is readable without relying on colour alone. */
export function StatusIcon({ state, className }: { state: ProgressState; className?: string }) {
  if (state.status === "not_started") {
    return (
      <svg viewBox="0 0 24 24" className={cn("size-6 text-muted-foreground/60", className)} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (state.status === "in_progress") {
    return (
      <svg viewBox="0 0 24 24" className={cn("size-6 text-amber-500", className)} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <span className={cn("flex flex-col items-center leading-none", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-6 text-emerald-600 dark:text-emerald-500">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {state.stars ? <span className="text-[10px] tracking-tighter text-amber-500">{"★".repeat(state.stars)}</span> : null}
    </span>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm" aria-hidden>
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
