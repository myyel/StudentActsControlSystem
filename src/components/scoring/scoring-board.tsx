"use client";

import { Check } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { giveBehaviorAction } from "@/app/ogretmen/scoring-actions";
import { CharacterImage } from "@/components/characters/character-image";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import { Button } from "@/components/ui/button";
import { formatPoints, UNDO_WINDOW_MS } from "@/lib/behavior";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";
import { BehaviorPicker, type PickerBehavior } from "./behavior-picker";
import { UndoBar, type LastScore } from "./undo-bar";

type Student = {
  id: string;
  firstName: string;
  lastInitial: string | null;
  xp: number;
  stage: { name: string; assetUrl: string };
};

type Props = { classId: string; students: Student[]; behaviors: PickerBehavior[] };

/** Class scoring: tap a card, tap a behavior. Cards show name and XP only (screen may be projected). */
export function ScoringBoard({ classId, students, behaviors }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const [pending, start] = useTransition();
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);

  const byId = new Map(students.map((s) => [s.id, s]));
  const title =
    targets?.length === 1 ? formatStudentName(byId.get(targets[0]!)!) : `${targets?.length ?? 0} öğrenci`;

  function onCardClick(id: string) {
    if (!selectMode) {
      setError(null);
      setTargets([id]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onPick(behaviorId: string, note: string) {
    if (!targets) return;
    const studentIds = targets;
    const batchId = newUuid();
    start(async () => {
      const result = await giveBehaviorAction(classId, { studentIds, behaviorTypeId: behaviorId, note, batchId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { name, points, count, levelUps } = result.data;
      const who = count === 1 ? formatStudentName(byId.get(studentIds[0]!)!) : `${count} öğrenci`;
      setTargets(null);
      setSelected(new Set());
      setSelectMode(false);
      // The server window started when the event was written; stay a second inside it.
      const expiresAt = Date.now() + UNDO_WINDOW_MS - 1000;
      setLastScore({ batchId, label: `${who} · ${name} ${formatPoints(points)}`, expiresAt });
      setFlash(new Set(studentIds));
      setTimeout(() => setFlash(new Set()), 900);
      if (levelUps.length > 0) {
        setCelebrations({
          key: `level-up-${batchId}`,
          items: levelUps.map((levelUp) => ({ studentName: formatStudentName(byId.get(levelUp.studentId)!), levelUp })),
        });
      }
    });
  }

  if (students.length === 0) {
    return <p className="text-muted-foreground">Puan verilecek aktif öğrenci yok. Aşağıdan öğrenci ekleyin.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={selectMode ? "default" : "outline"}
          className="h-11"
          aria-pressed={selectMode}
          onClick={() => {
            setSelectMode(!selectMode);
            setSelected(new Set());
          }}
        >
          {selectMode ? "Çoklu seçimi kapat" : "Çoklu seç"}
        </Button>
        {selectMode && (
          <>
            <Button variant="outline" className="h-11" onClick={() => setSelected(new Set(students.map((s) => s.id)))}>
              Tümünü seç
            </Button>
            <Button
              className="h-11"
              disabled={selected.size === 0}
              onClick={() => {
                setError(null);
                setTargets([...selected]);
              }}
            >
              {selected.size} öğrenciye puan ver
            </Button>
          </>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {students.map((s) => {
          const isSelected = selected.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onCardClick(s.id)}
                aria-pressed={selectMode ? isSelected : undefined}
                className={cn(
                  "relative flex min-h-24 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent",
                  isSelected && "border-primary bg-primary/10",
                  flash.has(s.id) && "motion-safe:animate-pulse border-emerald-500",
                )}
              >
                <CharacterImage stage={s.stage} size={56} decorative />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-lg font-semibold">{formatStudentName(s)}</span>
                  <span className="text-sm text-muted-foreground">{s.xp} XP</span>
                </span>
                {isSelected && (
                  <Check className="absolute top-2 right-2 size-5 text-primary" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <BehaviorPicker
        open={targets !== null}
        onOpenChange={(open) => !open && setTargets(null)}
        title={title}
        detailHref={
          targets?.length === 1 ? `/ogretmen/siniflar/${classId}/ogrenciler/${targets[0]}` : undefined
        }
        behaviors={behaviors}
        pending={pending}
        error={error}
        onPick={onPick}
      />

      {lastScore && <UndoBar key={lastScore.batchId} score={lastScore} onClose={closeUndo} />}
      {celebrations && (
        <LevelUpCelebration key={celebrations.key} items={celebrations.items} onDone={closeCelebration} />
      )}
    </div>
  );
}
