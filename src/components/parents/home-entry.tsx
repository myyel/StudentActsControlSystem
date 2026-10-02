"use client";

import { Check } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { giveHomeBehaviorAction, undoHomeBatchAction } from "@/app/veli/home-actions";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import { UndoBar, type LastScore } from "@/components/scoring/undo-bar";
import { behaviorTone, formatPoints, UNDO_WINDOW_MS } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";

type HomeType = { id: string; name: string; icon: string; points: number };

type Props = {
  studentId: string;
  /** First name: "Deniz'in ejderhası büyüdü!" */
  childName: string;
  types: HomeType[];
  todayXp: number;
  cap: number;
  /** Marks per behavior today (all parents), shown as ✓ ×2 on the sticker. */
  todayCounts: Record<string, number>;
  disabled?: boolean;
};

/** "Evde bugün": the parent (and child) tap what the child did at home; the daily cap limits XP only. */
export function HomeEntry({ studentId, childName, types, todayXp, cap, todayCounts, disabled }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);

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
            ? "Bugünkü ev enerjisi doldu 🌙 Yarın yeniden! Davranış kaydedildi, karaktere XP eklenmedi."
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
      <EnergyJar value={todayXp} cap={cap} />

      {types.length === 0 ? (
        <p className="text-muted-foreground">Öğretmen henüz ev davranışı eklemedi.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {types.map((t) => {
            const count = todayCounts[t.id] ?? 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={pending || disabled}
                  onClick={() => onPick(t)}
                  className={cn(
                    "relative flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 p-3 text-center outline-none transition-[transform,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/60 active:translate-y-0.5 disabled:opacity-50 motion-reduce:active:translate-y-0",
                    count > 0
                      ? "border-grass-strong/60 bg-grass-soft shadow-[0_4px_0_color-mix(in_oklab,var(--grass)_45%,transparent)]"
                      : `tone-${behaviorTone(t.icon)} border-transparent bg-(--tile) shadow-[0_4px_0_var(--tile-edge)]`,
                  )}
                >
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-grass-strong px-2 text-sm font-extrabold text-white motion-safe:animate-pop dark:text-ink">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                      {count > 1 && `×${count}`}
                      <span className="sr-only">Bugün {count} kez işaretlendi</span>
                    </span>
                  )}
                  <span className="text-4xl leading-none" aria-hidden>
                    {t.icon}
                  </span>
                  <span className="leading-tight font-bold">{t.name}</span>
                  {count === 0 && <span className="text-sm font-extrabold text-grass-strong">{formatPoints(t.points)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {notice && (
        <p role="status" className="rounded-2xl bg-sun-soft p-3 text-sm font-semibold">
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

/** The daily home XP cap as a filling jar; full means "enough for today". */
function EnergyJar({ value, cap }: { value: number; cap: number }) {
  const shown = Math.min(value, cap);
  const full = shown >= cap;
  const level = cap === 0 ? 1 : shown / cap;
  // Jar body: y 22…74 inside a 64×80 box.
  const fillTop = 74 - 52 * level;
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-[0_4px_0_var(--kid-shadow)]">
      <svg viewBox="0 0 64 80" className="h-20 w-16 shrink-0" aria-hidden>
        <defs>
          <clipPath id="jar-body">
            <rect x="8" y="22" width="48" height="52" rx="12" />
          </clipPath>
        </defs>
        <rect x="8" y="22" width="48" height="52" rx="12" className="fill-sun-soft" />
        <rect
          x="8"
          y={fillTop}
          width="48"
          height={74 - fillTop}
          clipPath="url(#jar-body)"
          className="fill-sun transition-[y,height] duration-500 motion-reduce:transition-none"
        />
        {Array.from({ length: Math.round(level * 5) }, (_, i) => (
          <circle key={i} cx={18 + (i % 3) * 14} cy={66 - Math.floor(i / 3) * 12} r="3.5" fill="#fff" opacity=".85" />
        ))}
        <rect x="8" y="22" width="48" height="52" rx="12" fill="none" strokeWidth="3" className="stroke-sun-press" />
        <rect x="14" y="10" width="36" height="12" rx="4" className="fill-[#b07a4f]" />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-display text-xl font-extrabold">
          Ev enerjisi {shown} / {cap}
        </p>
        <div
          role="progressbar"
          aria-label="Bugünkü ev XP'si"
          aria-valuemin={0}
          aria-valuemax={cap}
          aria-valuenow={shown}
          className="sr-only"
        />
        <p className="text-sm text-muted-foreground">
          {full
            ? "Bugünkü ev enerjisi doldu 🌙 Yarın yeniden! İşaretlemeye devam edebilirsiniz; XP eklenmez."
            : "Günlük tavan dolunca işaretlemeye devam edebilirsiniz; XP yarın yeniden başlar."}
        </p>
      </div>
    </div>
  );
}
