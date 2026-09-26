"use client";

import { useEffect, useState, useTransition } from "react";
import { undoBatchAction } from "@/app/ogretmen/scoring-actions";
import { Button } from "@/components/ui/button";

export type LastScore = { batchId: string; label: string; expiresAt: number };

/** Bottom bar with a countdown; the server enforces the same window. */
export function UndoBar({ score, onClose }: { score: LastScore; onClose: () => void }) {
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
      <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border bg-background p-3 shadow-lg">
        <p className="min-w-0 flex-1 truncate text-sm">{message ?? score.label}</p>
        {!message && (
          <Button
            variant="outline"
            className="h-11 shrink-0"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await undoBatchAction(score.batchId);
                setMessage(result.ok ? "Geri alındı." : result.error);
              })
            }
          >
            Geri al ({secondsLeft})
          </Button>
        )}
      </div>
    </div>
  );
}
