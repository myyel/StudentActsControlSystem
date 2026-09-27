"use client";

import { Maximize, Minimize, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { giveBehaviorAction } from "@/app/ogretmen/scoring-actions";
import { CharacterImage } from "@/components/characters/character-image";
import { LevelBar } from "@/components/characters/level-bar";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import type { PickerBehavior } from "@/components/scoring/behavior-picker";
import { UndoBar, type LastScore } from "@/components/scoring/undo-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";
import type { BoardStudent } from "@/server/services/character";

type Props = { classId: string; className: string; students: BoardStudent[]; behaviors: PickerBehavior[] };

/**
 * Full screen class board for the smartboard. Children see it: positive behaviors only,
 * no XP, balance or ranking; cards are in name order. Touch targets are at least 80px.
 */
export function Board({ classId, className, students, behaviors }: Props) {
  const [targets, setTargets] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, start] = useTransition();
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);

  const byId = new Map(students.map((s) => [s.id, s]));
  const wholeClass = targets !== null && targets.length > 1;
  const title = wholeClass ? "Tüm sınıf" : targets ? formatStudentName(byId.get(targets[0]!)!) : "";

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function onPick(behavior: PickerBehavior) {
    if (!targets) return;
    const studentIds = targets;
    const batchId = newUuid();
    start(async () => {
      const result = await giveBehaviorAction(classId, { studentIds, behaviorTypeId: behavior.id, batchId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTargets(null);
      const who = studentIds.length === 1 ? formatStudentName(byId.get(studentIds[0]!)!) : "Tüm sınıf";
      // The server window started when the event was written; stay a second inside it.
      setLastScore({ batchId, label: `${behavior.icon} ${who} · ${behavior.name}`, expiresAt: Date.now() + UNDO_WINDOW_MS - 1000 });
      setFlash(new Set(studentIds));
      setTimeout(() => setFlash(new Set()), 1200);
      const { levelUps } = result.data;
      if (levelUps.length > 0) {
        setCelebrations({
          key: `level-up-${batchId}`,
          items: levelUps.map((levelUp) => ({ studentName: formatStudentName(byId.get(levelUp.studentId)!), levelUp })),
        });
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-32 lg:p-6 lg:pb-36">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-bold lg:text-4xl">{className}</h1>
        <Button
          variant="outline"
          className="h-20 min-w-20 gap-2 px-5 text-xl"
          disabled={students.length === 0}
          onClick={() => {
            setError(null);
            setTargets(students.map((s) => s.id));
          }}
        >
          <Users className="size-7" aria-hidden />
          Tüm sınıf
        </Button>
        <Button
          variant="outline"
          className="h-20 min-w-20 gap-2 px-5 text-xl"
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
        >
          {fullscreen ? <Minimize className="size-7" aria-hidden /> : <Maximize className="size-7" aria-hidden />}
          <span className="max-sm:sr-only">{fullscreen ? "Tam ekrandan çık" : "Tam ekran"}</span>
        </Button>
        <Link
          href={`/ogretmen/siniflar/${classId}`}
          onClick={() => document.fullscreenElement && void document.exitFullscreen()}
          className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-md border px-5 text-xl font-medium hover:bg-accent"
        >
          <X className="size-7" aria-hidden />
          <span className="max-sm:sr-only">Çık</span>
        </Link>
      </header>

      {students.length === 0 ? (
        <p className="text-2xl text-muted-foreground">Bu sınıfta aktif öğrenci yok.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {students.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setTargets([s.id]);
                }}
                className={cn(
                  "flex min-h-20 w-full flex-col items-center gap-2 rounded-3xl border-2 bg-card p-3 text-center shadow-sm transition-colors hover:border-emerald-400 active:scale-[0.98] motion-reduce:active:scale-100",
                  flash.has(s.id) && "border-emerald-500 bg-emerald-50 motion-safe:animate-pulse dark:bg-emerald-950",
                )}
              >
                <CharacterImage stage={s.stage} size={160} decorative className="h-auto w-full max-w-40" />
                <span className="w-full truncate text-2xl font-bold lg:text-3xl">{formatStudentName(s)}</span>
                <LevelBar
                  level={s.level}
                  progress={s.progress}
                  className="h-4"
                  label={`${formatStudentName(s)}: ${s.stage.name}`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={targets !== null} onOpenChange={(open) => !open && setTargets(null)}>
        <DialogContent showCloseButton={false} className="max-h-[92dvh] overflow-y-auto p-6 sm:max-w-4xl">
          <DialogTitle className="text-3xl">{title}</DialogTitle>
          <DialogDescription className="text-lg">
            {wholeClass ? "Tüm sınıfa hangi davranış için puan verilsin?" : "Hangi davranış için puan verilsin?"}
          </DialogDescription>
          {behaviors.length === 0 ? (
            <p className="text-xl">Bu sınıfta aktif olumlu davranış yok.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {behaviors.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={pending}
                  onClick={() => onPick(b)}
                  className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950"
                >
                  <span className="text-5xl" aria-hidden>
                    {b.icon}
                  </span>
                  <span className="text-xl leading-tight font-semibold">{b.name}</span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="text-lg text-destructive">
              {error}
            </p>
          )}
          <Button variant="outline" className="h-20 text-2xl" onClick={() => setTargets(null)}>
            Vazgeç
          </Button>
        </DialogContent>
      </Dialog>

      {lastScore && <UndoBar key={lastScore.batchId} score={lastScore} onClose={closeUndo} large />}
      {celebrations && (
        <LevelUpCelebration key={celebrations.key} items={celebrations.items} onDone={closeCelebration} large />
      )}
    </div>
  );
}
