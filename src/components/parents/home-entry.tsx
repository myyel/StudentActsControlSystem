"use client";

import { useCallback, useState, useTransition } from "react";
import { giveHomeBehaviorAction, undoHomeBatchAction } from "@/app/veli/home-actions";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import { UndoBar, type LastScore } from "@/components/scoring/undo-bar";
import { formatPoints, UNDO_WINDOW_MS } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";

type HomeType = { id: string; name: string; icon: string; points: number };

type Props = {
  studentId: string;
  childName: string;
  types: HomeType[];
  todayXp: number;
  cap: number;
  disabled?: boolean;
};

/** "Evde bugün": the parent taps what the child did at home; the daily cap limits XP only. */
export function HomeEntry({ studentId, childName, types, todayXp, cap, disabled }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);
  const capReached = todayXp >= cap;

  function onPick(type: HomeType) {
    const batchId = newUuid();
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await giveHomeBehaviorAction(studentId, { behaviorTypeId: type.id, batchId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { xpAdded, points, levelUps } = result.data;
      setLastScore({ batchId, label: `${type.icon} ${type.name} kaydedildi`, expiresAt: Date.now() + UNDO_WINDOW_MS - 1000 });
      if (xpAdded < points) {
        setNotice(
          xpAdded === 0
            ? "Bugünkü ev XP tavanı doldu: davranış kaydedildi, ama karaktere XP eklenmedi."
            : `Günlük tavan nedeniyle ${points} yerine ${xpAdded} XP eklendi.`,
        );
      }
      if (levelUps.length > 0) {
        setCelebrations({ key: `level-up-${batchId}`, items: levelUps.map((levelUp) => ({ studentName: childName, levelUp })) });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">Bugün evden kazanılan XP</span>
          <span className={cn("font-semibold", capReached && "text-amber-700 dark:text-amber-400")}>
            {Math.min(todayXp, cap)} / {cap}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Bugünkü ev XP'si"
          aria-valuemin={0}
          aria-valuemax={cap}
          aria-valuenow={Math.min(todayXp, cap)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full", capReached ? "bg-amber-500" : "bg-sky-500")}
            style={{ width: `${cap === 0 ? 100 : Math.min(todayXp / cap, 1) * 100}%` }}
          />
        </div>
        {capReached && (
          <p className="text-sm text-muted-foreground">
            Bugünün tavanı doldu. Yine de işaretleyebilirsiniz; davranış kaydedilir ama XP eklenmez. Yarın yeniden başlar.
          </p>
        )}
      </div>

      {types.length === 0 ? (
        <p className="text-muted-foreground">Öğretmen henüz ev davranışı eklemedi.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {types.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={pending || disabled}
                onClick={() => onPick(t)}
                className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition-colors hover:border-sky-500 hover:bg-sky-50 disabled:opacity-50 dark:hover:bg-sky-950"
              >
                <span className="text-3xl" aria-hidden>
                  {t.icon}
                </span>
                <span className="leading-tight font-medium">{t.name}</span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatPoints(t.points)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {lastScore && <UndoBar key={lastScore.batchId} score={lastScore} onClose={closeUndo} undo={undoHomeBatchAction} />}
      {celebrations && (
        <LevelUpCelebration key={celebrations.key} items={celebrations.items} onDone={closeCelebration} />
      )}
    </div>
  );
}
