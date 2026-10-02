"use client";

import { Maximize, Minimize, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { giveBehaviorAction } from "@/app/ogretmen/scoring-actions";
import { BehaviorTile } from "@/components/behaviors/behavior-tile";
import { CharacterAvatar, LevelStars } from "@/components/characters/character-avatar";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import type { PickerBehavior } from "@/components/scoring/behavior-picker";
import { UndoBar, type LastScore } from "@/components/scoring/undo-bar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import { nextStageSentence } from "@/lib/character";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";
import type { BoardStudent } from "@/server/services/character";
import { CharacterChooser, type BoardCharacterType } from "./character-chooser";

type Props = {
  classId: string;
  className: string;
  students: BoardStudent[];
  behaviors: PickerBehavior[];
  characterTypes: BoardCharacterType[];
  /** Student whose character is chosen together on the board (opened from the student detail). */
  chooseFor?: string;
  goal?: React.ReactNode;
};

type Balloon = { key: string; text: string; ids: Set<string> };

const BALLOON_MS = 1500;
const iconButton =
  "kid-card flex size-20 shrink-0 items-center justify-center outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60";

/**
 * Full screen class board for the smartboard. Children see it: positive behaviors only, no XP,
 * balance or ranking; cards are in name order. Touch targets are at least 80px.
 */
export function Board({ classId, className, students, behaviors, characterTypes, chooseFor, goal }: Props) {
  const [targets, setTargets] = useState<string[] | null>(null);
  // Kept after closing so the picker does not switch to "Tüm sınıf" during its close animation.
  const [shownTargets, setShownTargets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [balloon, setBalloon] = useState<Balloon | null>(null);
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const [choosing, setChoosing] = useState<string | null>(chooseFor ?? null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, start] = useTransition();
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);

  const byId = new Map(students.map((s) => [s.id, s]));
  const single = shownTargets.length === 1 ? byId.get(shownTargets[0]!) : undefined;
  const chooser = choosing ? byId.get(choosing) : undefined;

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!balloon) return;
    const timer = setTimeout(() => setBalloon(null), BALLOON_MS);
    return () => clearTimeout(timer);
  }, [balloon]);

  function openPicker(ids: string[]) {
    setError(null);
    setTargets(ids);
    setShownTargets(ids);
  }

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
      // Everyone sees who was praised and why.
      setBalloon({ key: batchId, text: `+${behavior.points} ⭐ ${behavior.name}`, ids: new Set(studentIds) });
      const { levelUps } = result.data;
      if (levelUps.length > 0) {
        setCelebrations({
          key: `level-up-${batchId}`,
          items: levelUps.map((levelUp) => ({ studentName: byId.get(levelUp.studentId)!.firstName, levelUp })),
        });
      }
    });
  }

  return (
    <div data-surface="kid" className="flex flex-1 flex-col gap-4 p-4 pb-36 lg:p-6 lg:pb-36 lg:short:gap-3 lg:short:pt-3">
      <header className="flex flex-wrap items-center gap-3 lg:gap-4 lg:short:gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-4xl leading-none font-extrabold lg:text-5xl">{className}</h1>
          <p className="mt-1 text-lg font-bold">Bugün harika gidiyoruz!</p>
        </div>
        {goal}
        <div className="flex flex-wrap gap-3 lg:gap-4">
          <button
            type="button"
            disabled={students.length === 0}
            onClick={() => openPicker(students.map((s) => s.id))}
            className="flex h-20 items-center gap-3 rounded-3xl bg-sun px-6 text-2xl font-extrabold text-ink shadow-[0_4px_0_var(--sun-press)] outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60 active:translate-y-0.5 disabled:opacity-50"
          >
            <Users className="size-8" aria-hidden />
            Tüm sınıf
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? "Tam ekrandan çık" : "Tam ekran"}
            className={iconButton}
          >
            {fullscreen ? <Minimize className="size-8" aria-hidden /> : <Maximize className="size-8" aria-hidden />}
          </button>
          <Link
            href={`/ogretmen/siniflar/${classId}`}
            aria-label="Çık"
            onClick={() => document.fullscreenElement && void document.exitFullscreen()}
            className={iconButton}
          >
            <X className="size-8" aria-hidden />
          </Link>
        </div>
      </header>

      {students.length === 0 ? (
        <p className="text-2xl font-semibold">Bu sınıfta aktif öğrenci yok.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4 2xl:grid-cols-6">
          {students.map((s) => {
            const praised = balloon?.ids.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openPicker([s.id])}
                  className={cn(
                    "kid-card relative flex min-h-20 w-full flex-col items-center gap-1 border-4 p-2 text-center outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60 active:scale-[0.96] motion-reduce:active:scale-100 lg:p-3 lg:short:gap-0 lg:short:p-1.5",
                    praised ? "border-sun" : "border-transparent",
                  )}
                >
                  {praised && (
                    <span
                      key={balloon!.key}
                      aria-hidden
                      className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-grass-strong px-3 py-1 text-base font-extrabold whitespace-nowrap text-white shadow-md motion-safe:animate-balloon dark:text-ink"
                    >
                      {balloon!.text}
                    </span>
                  )}
                  <CharacterAvatar
                    // New key restarts the hop for every praise.
                    key={praised ? `hop-${balloon!.key}` : undefined}
                    stage={s.stage}
                    level={s.level}
                    progress={s.progress}
                    size={88}
                    className={cn("lg:short:[--avatar:60px] 2xl:[--avatar:116px]", praised && "motion-safe:animate-hop")}
                  />
                  <span className="w-full truncate font-display text-2xl leading-tight font-extrabold lg:short:text-xl 2xl:text-3xl">
                    {formatStudentName(s)}
                  </span>
                  <span className="sr-only">{s.stage.name}</span>
                  <LevelStars level={s.level} size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={targets !== null} onOpenChange={(open) => !open && setTargets(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[94dvh] gap-0 overflow-y-auto rounded-[2rem] border-0 p-0 sm:max-w-5xl md:grid-cols-[minmax(0,17rem)_1fr]"
        >
          <section className="flex flex-col items-center justify-center gap-3 bg-grass-soft p-6 text-center max-md:pb-4">
            {single ? (
              <>
                <CharacterAvatar
                  stage={single.stage}
                  level={single.level}
                  progress={single.progress}
                  size={150}
                  className="md:[--avatar:210px]"
                />
                <p className="font-display text-4xl font-extrabold">{formatStudentName(single)}</p>
                <LevelStars level={single.level} size={24} />
                <p className="rounded-2xl bg-card px-4 py-2 text-lg font-bold shadow-sm">
                  {nextStageSentence(single.progress, single.nextStageName)}
                </p>
              </>
            ) : (
              <>
                <span className="text-8xl" aria-hidden>
                  👥
                </span>
                <p className="font-display text-4xl font-extrabold">Tüm sınıf</p>
              </>
            )}
          </section>

          <section className="flex flex-col gap-4 p-6">
            <DialogTitle className="font-display text-4xl font-extrabold">
              {single ? `${single.firstName} ne yaptı?` : "Sınıfımız ne yaptı?"}
            </DialogTitle>
            <DialogDescription className="sr-only">Bir davranışa dokunun; puan hemen kaydedilir.</DialogDescription>
            {behaviors.length === 0 ? (
              <p className="text-xl">Bu sınıfta aktif olumlu davranış yok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {behaviors.map((b) => (
                  <BehaviorTile key={b.id} {...b} tone="kid" disabled={pending} onClick={() => onPick(b)} />
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="text-lg text-destructive">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => setTargets(null)}
              className="h-20 rounded-3xl bg-muted text-2xl font-bold outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60"
            >
              Vazgeç
            </button>
          </section>
        </DialogContent>
      </Dialog>

      {chooser && <CharacterChooser student={chooser} types={characterTypes} onClose={() => setChoosing(null)} />}
      {lastScore && <UndoBar key={lastScore.batchId} score={lastScore} onClose={closeUndo} large />}
      {celebrations && (
        <LevelUpCelebration key={celebrations.key} items={celebrations.items} onDone={closeCelebration} large />
      )}
    </div>
  );
}
