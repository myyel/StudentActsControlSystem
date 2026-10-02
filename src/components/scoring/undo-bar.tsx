"use client";

import { useEffect, useState, useTransition } from "react";
import { undoBatchAction } from "@/app/ogretmen/scoring-actions";
import type { ActionResult } from "@/server/action-result";
import { Button } from "@/components/ui/button";
import { CharacterImage } from "@/components/characters/character-image";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import { cn } from "@/lib/utils";

export type LastScore = {
  batchId: string;
  label: string;
  expiresAt: number;
  /** The scored student's character: a wrong student is noticed at a glance. */
  stage?: { name: string; assetUrl: string };
};

/** Bottom bar with a countdown; the server enforces the same window. */
type Props = {
  score: LastScore;
  onClose: () => void;
  /** Board mode: 80px touch target. */
  large?: boolean;
  /** Defaults to the teacher's undo; parents pass their own. */
  undo?: (batchId: string) => Promise<ActionResult<{ undone: number }>>;
};

export function UndoBar({ score, onClose, large, undo = undoBatchAction }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const secondsLeft = Math.max(0, Math.ceil((score.expiresAt - now) / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !message) onClose();
  }, [secondsLeft, message, onClose]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden"
    >
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl bg-[#2b2d42] p-2 pl-3 text-white shadow-lg",
          large ? "max-w-3xl rounded-3xl" : "max-w-xl",
        )}
      >
        {score.stage && <CharacterImage stage={score.stage} size={large ? 64 : 36} decorative className="rounded-full bg-white" />}
        <p className={cn("min-w-0 flex-1 truncate font-semibold", large ? "text-2xl" : "text-sm")}>{message ?? score.label}</p>
        {!message && (
          <Button
            variant="outline"
            aria-label={`Geri al (${secondsLeft} sn)`}
            className={cn(
              "shrink-0 gap-2 rounded-xl border-white/30 bg-white/10 font-extrabold text-white hover:bg-white/20 hover:text-white dark:bg-white/10",
              large ? "h-20 px-6 text-2xl" : "h-11",
            )}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await undo(score.batchId);
                setMessage(result.ok ? "Geri alındı." : result.error);
              })
            }
          >
            <Countdown seconds={secondsLeft} fraction={(score.expiresAt - now) / (UNDO_WINDOW_MS - 1000)} large={large} />
            Geri al
          </Button>
        )}
      </div>
    </div>
  );
}

/** Seconds left as a number inside an emptying ring. */
function Countdown({ seconds, fraction, large }: { seconds: number; fraction: number; large?: boolean }) {
  const c = 2 * Math.PI * 15;
  return (
    <span aria-hidden className={cn("relative inline-flex items-center justify-center", large ? "size-12" : "size-8")}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" stroke="rgb(255 255 255 / 0.2)" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          strokeWidth="4"
          stroke="#ffc83d"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, fraction)))}
        />
      </svg>
      <span className={cn("relative font-extrabold", large ? "text-lg" : "text-xs")}>{seconds}</span>
    </span>
  );
}
