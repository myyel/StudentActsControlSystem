"use client";

import { Check, CheckCheck, ListChecks, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { giveBehaviorAction } from "@/app/ogretmen/scoring-actions";
import { CharacterAvatar } from "@/components/characters/character-avatar";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import { softOutlineButton, toggleOn } from "@/components/action-styles";
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
  gradeLevel: number;
  xp: number;
  level: number;
  stage: { name: string; assetUrl: string };
};

type Props = { classId: string; gradeLevels: number[]; students: Student[]; behaviors: PickerBehavior[] };

/**
 * Class scoring: tap a card, tap a behavior. Cards show name and XP only (screen may be projected).
 * Combined classes get a grade filter and a small grade label on each card.
 */
export function ScoringBoard({ classId, gradeLevels, students: allStudents, behaviors }: Props) {
  const combined = gradeLevels.length > 1;
  const [grade, setGrade] = useState<number | null>(null);
  const students = grade === null ? allStudents : allStudents.filter((s) => s.gradeLevel === grade);
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

  const byId = new Map(allStudents.map((s) => [s.id, s]));
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
      setLastScore({
        batchId,
        label: `${who} · ${name} ${formatPoints(points)}`,
        expiresAt,
        stage: count === 1 ? byId.get(studentIds[0]!)!.stage : undefined,
      });
      setFlash(new Set(studentIds));
      setTimeout(() => setFlash(new Set()), 900);
      if (levelUps.length > 0) {
        setCelebrations({
          key: `level-up-${batchId}`,
          items: levelUps.map((levelUp) => ({ studentName: byId.get(levelUp.studentId)!.firstName, levelUp })),
        });
      }
    });
  }

  if (allStudents.length === 0) {
    return <p className="text-muted-foreground">Puan verilecek aktif öğrenci yok. Aşağıdan öğrenci ekleyin.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {combined && (
        <div role="group" aria-label="Düzeye göre süz" className="flex flex-wrap gap-2">
          {[null, ...gradeLevels].map((g) => {
            const count = g === null ? allStudents.length : allStudents.filter((s) => s.gradeLevel === g).length;
            return (
              <button
                key={g ?? "all"}
                type="button"
                aria-pressed={grade === g}
                onClick={() => {
                  setGrade(g);
                  setSelected(new Set());
                }}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                  grade === g ? "bg-sky-ink text-white" : "bg-card shadow-[0_2px_0_var(--kid-shadow)] hover:bg-accent",
                )}
              >
                {g === null ? "Tümü" : `${g}. sınıf`}
                <span className={cn("rounded-full px-2 text-xs", grade === g ? "bg-white/20" : "bg-muted")}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {/* Prominent: scoring several children at once is a main action on this screen. */}
        <Button
          className={cn(
            softOutlineButton,
            selectMode && toggleOn,
          )}
          aria-pressed={selectMode}
          onClick={() => {
            setSelectMode(!selectMode);
            setSelected(new Set());
          }}
        >
          {selectMode ? <X className="size-5" aria-hidden /> : <ListChecks className="size-5" aria-hidden />}
          {selectMode ? "Çoklu seçimi kapat" : "Çoklu seç"}
        </Button>
        {selectMode && (
          <>
            <Button className={softOutlineButton} onClick={() => setSelected(new Set(students.map((s) => s.id)))}>
              <CheckCheck className="size-5" aria-hidden />
              Tümünü seç
            </Button>
            <Button
              className="h-12 rounded-xl bg-grass-strong px-5 text-base font-extrabold text-white shadow-[0_3px_0_var(--kid-shadow)] hover:bg-grass-strong/90 dark:text-ink"
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
                  "relative flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left transition-colors hover:bg-accent",
                  isSelected ? "border-sky bg-sky-soft" : "border-transparent shadow-[0_1px_0_var(--line)]",
                  flash.has(s.id) && "border-grass motion-safe:animate-pulse",
                )}
              >
                <CharacterAvatar stage={s.stage} size={52} className="rounded-full bg-muted" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-lg font-bold">{formatStudentName(s)}</span>
                  {combined && (
                    <span className="w-fit rounded-full bg-lav-soft px-2 text-xs font-bold text-lav-ink">{s.gradeLevel}. sınıf</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Sv {s.level} · {s.xp} XP
                  </span>
                </span>
                {isSelected && (
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-sky-ink text-white dark:text-ink">
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
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
        stage={targets?.length === 1 ? byId.get(targets[0]!)?.stage : undefined}
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
