"use client";

import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { giveBehaviorAction } from "@/app/ogretmen/scoring-actions";
import { BehaviorTile } from "@/components/behaviors/behavior-tile";
import { CharacterAvatar, LevelStars } from "@/components/characters/character-avatar";
import { LevelUpCelebration, type Celebration } from "@/components/characters/level-up-celebration";
import type { PickerBehavior } from "@/components/scoring/behavior-picker";
import { UndoBar, type LastScore } from "@/components/scoring/undo-bar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import type { Activity } from "@/lib/activity";
import { nextStageSentence } from "@/lib/character";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { newUuid } from "@/lib/uuid";
import type { BoardStudent } from "@/server/services/character";
import { ActivityAlarm } from "./activity-alarm";
import { useAutoAdvance, useCardsPerPage } from "./use-board-pages";

type Props = {
  classId: string;
  className: string;
  students: BoardStudent[];
  behaviors: PickerBehavior[];
  goal?: React.ReactNode;
  /** Weekly activity times; the board rings at today's (PRD §4.12). */
  activity?: { timeZone: string; activities: Activity[] };
};

type Balloon = { key: string; text: string; ids: Set<string> };

const BALLOON_MS = 1500;
const iconButton =
  "kid-card flex size-20 shrink-0 items-center justify-center outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60";

/**
 * Full screen class board for the smartboard. Children see it: positive behaviors only, no XP,
 * balance or ranking; cards are in name order. Touch targets are at least 80px.
 * The board never scrolls: when the class does not fit the screen (windowed or fullscreen), the
 * cards are split into pages that slide every 10 seconds, so every child is shown in turn.
 */
export function Board({ classId, className, students, behaviors, goal, activity }: Props) {
  const [targets, setTargets] = useState<string[] | null>(null);
  // Kept after closing so the picker does not switch to "Tüm sınıf" during its close animation.
  const [shownTargets, setShownTargets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<LastScore | null>(null);
  const [balloon, setBalloon] = useState<Balloon | null>(null);
  const [celebrations, setCelebrations] = useState<{ key: string; items: Celebration[] } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, start] = useTransition();
  const [page, setPage] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closeUndo = useCallback(() => setLastScore(null), []);
  const closeCelebration = useCallback(() => setCelebrations(null), []);

  const byId = new Map(students.map((s) => [s.id, s]));
  // One picture per character type around the alarm bell.
  const alarmStages = [...new Map(students.map((s) => [s.characterTypeId, s.stage])).values()].slice(0, 6);
  const single = shownTargets.length === 1 ? byId.get(shownTargets[0]!) : undefined;

  const perPage = useCardsPerPage(viewportRef, students.length);
  const pages: BoardStudent[][] = [];
  for (let i = 0; i < students.length; i += perPage) pages.push(students.slice(i, i + perPage));
  const pageCount = pages.length;
  const current = Math.min(page, Math.max(pageCount - 1, 0));
  // Hold the page while the teacher is scoring, or a celebration or alarm is on.
  const paused = userPaused || targets !== null || celebrations !== null || alarmOpen;
  useAutoAdvance(current, pageCount, paused, setPage);

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
    // h-dvh: the board fits the screen; the bottom row (controls) leaves room for the undo bar.
    <div data-surface="kid" className="flex h-dvh flex-col gap-4 overflow-hidden p-4 pb-6 lg:p-6 lg:pb-6 lg:short:gap-3 lg:short:pt-3 lg:short:pb-5">
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
        <section aria-label="Öğrenciler" className="flex min-h-0 flex-1 flex-col">
          {/* Clip only sideways (the next page); the praise balloon may rise above the first row. */}
          <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-x-clip">
            <div
              className="flex h-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-in-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {pages.map((pageStudents, index) => (
                <ul
                  key={index}
                  data-board-page
                  // Pages off screen stay out of the tab order and the accessibility tree.
                  inert={index !== current}
                  className="grid h-full w-full shrink-0 grid-cols-2 content-center gap-3 px-1 pt-1 pb-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4 lg:short:gap-y-2 2xl:grid-cols-6 2xl:midh:gap-y-3"
                >
                  {pageStudents.map((s) => {
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
                            maxLevel={s.maxLevel}
                            progress={s.progress}
                            size={88}
                            className={cn("lg:short:[--avatar:52px] 2xl:[--avatar:116px] 2xl:midh:[--avatar:96px]", praised && "motion-safe:animate-hop")}
                          />
                          <span className="w-full truncate font-display text-2xl leading-tight font-extrabold lg:short:text-xl 2xl:text-3xl">
                            {formatStudentName(s)}
                          </span>
                          <span className="sr-only">{s.stage.name}</span>
                          <LevelStars level={s.level} maxLevel={s.maxLevel} size={18} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Always present, so the undo bar covers this row and never a card. */}
      <div className="flex h-20 shrink-0 items-center justify-center gap-2 sm:gap-4">
        {pageCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Önceki öğrenciler"
              onClick={() => setPage((current - 1 + pageCount) % pageCount)}
              className={iconButton}
            >
              <ChevronLeft className="size-10" aria-hidden />
            </button>
            {/* Where we are, without numbers: a thumb sliding along a track; fits any number of pages. */}
            <div aria-hidden className="h-5 min-w-12 flex-1 overflow-hidden rounded-full bg-card shadow-[inset_0_0_0_3px_var(--line)] sm:max-w-56">
              <div
                className="h-full rounded-full bg-grass-strong motion-safe:transition-transform motion-safe:duration-700"
                style={{ width: `${100 / pageCount}%`, transform: `translateX(${current * 100}%)` }}
              />
            </div>
            <button
              type="button"
              aria-label="Sonraki öğrenciler"
              onClick={() => setPage((current + 1) % pageCount)}
              className={iconButton}
            >
              <ChevronRight className="size-10" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={userPaused}
              aria-label={userPaused ? "Kaydırmayı sürdür" : "Kaydırmayı durdur"}
              onClick={() => setUserPaused(!userPaused)}
              className={iconButton}
            >
              {userPaused ? <Play className="size-8" aria-hidden /> : <Pause className="size-8" aria-hidden />}
            </button>
          </>
        )}
      </div>

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
                  maxLevel={single.maxLevel}
                  progress={single.progress}
                  size={150}
                  className="md:[--avatar:210px]"
                />
                <p className="font-display text-4xl font-extrabold">{formatStudentName(single)}</p>
                <LevelStars level={single.level} maxLevel={single.maxLevel} size={24} />
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

      {activity && (
        <ActivityAlarm
          classId={classId}
          timeZone={activity.timeZone}
          activities={activity.activities}
          stages={alarmStages}
          onOpenChange={setAlarmOpen}
        />
      )}
      {lastScore && <UndoBar key={lastScore.batchId} score={lastScore} onClose={closeUndo} large />}
      {celebrations && (
        <LevelUpCelebration key={celebrations.key} items={celebrations.items} onDone={closeCelebration} large />
      )}
    </div>
  );
}
