"use client";

import { BellRing } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterImage } from "@/components/characters/character-image";
import { dueActivity, schoolClock, type Activity } from "@/lib/activity";
import { startChime, unlockAudio } from "./chime";

const CHECK_MS = 15_000;
const CHIME_MS = 30_000;

type Props = {
  classId: string;
  timeZone: string;
  activities: Activity[];
  /** A few of the class's characters, hopping around the bell. */
  stages: { name: string; assetUrl: string }[];
  onOpenChange: (open: boolean) => void;
};

const storageKey = (classId: string, date: string) => `activity-alarm:${classId}:${date}`;

function alreadyRang(key: string, memory: Set<string>) {
  if (memory.has(key)) return true;
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function remember(key: string, memory: Set<string>) {
  memory.add(key);
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private window: the in-memory set still stops a second ring while the board stays open.
  }
}

/**
 * The class's activity time on the board (PRD §4.12): when today's time comes (in the school's
 * time zone) a full screen card with a swinging bell and hopping characters shows the activity, and a
 * bell sound rings for 30 seconds. It stays until "Tamam" and rings once a day.
 */
export function ActivityAlarm({ classId, timeZone, activities, stages, onOpenChange }: Props) {
  const [ringing, setRinging] = useState<{ activity: Activity; key: string } | null>(null);
  const memory = useRef(new Set<string>());
  const button = useRef<HTMLButtonElement>(null);

  // Sound needs one tap on the page first (browser autoplay rules).
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (activities.length === 0) return;
    const check = () => {
      const clock = schoolClock(timeZone, new Date());
      const due = dueActivity(activities, clock);
      if (!due) return;
      const key = storageKey(classId, clock.date);
      if (alreadyRang(key, memory.current)) return;
      remember(key, memory.current);
      setRinging((current) => current ?? { activity: due, key });
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    return () => clearInterval(timer);
  }, [activities, classId, timeZone]);

  const open = ringing !== null;
  useEffect(() => {
    onOpenChange(open);
    if (!open) return;
    button.current?.focus();
    return startChime(CHIME_MS);
  }, [open, onOpenChange]);

  const close = useCallback(() => setRinging(null), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!ringing) return null;
  const { activity } = ringing;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="activity-alarm-title"
      aria-describedby="activity-alarm-time"
      data-surface="kid"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="relative flex w-full max-w-3xl flex-col items-center gap-5 overflow-hidden rounded-[2rem] p-8 text-center text-ink shadow-xl motion-safe:animate-pop"
        style={{ background: "radial-gradient(circle at 50% 30%, #fffaf0 0, #ffe7a3 75%)" }}
      >
        <BellRing
          aria-hidden
          strokeWidth={2.2}
          className="size-32 origin-top fill-sun text-sun-press motion-safe:animate-ring 2xl:size-40"
        />
        <p className="font-display text-2xl font-extrabold text-grass-strong">Etkinlik zamanı!</p>
        <h2 id="activity-alarm-title" className="font-display text-5xl leading-tight font-extrabold break-words 2xl:text-6xl">
          {activity.name}
        </h2>
        <p id="activity-alarm-time" className="text-2xl font-bold text-muted-foreground">
          Saat {activity.time}
        </p>
        {stages.length > 0 && (
          <div aria-hidden className="flex flex-wrap items-end justify-center gap-3">
            {stages.map((stage, i) => (
              <span key={i} className="motion-safe:animate-hop-loop" style={{ animationDelay: `${i * 140}ms` }}>
                <CharacterImage stage={stage} size={88} decorative />
              </span>
            ))}
          </div>
        )}
        <button
          ref={button}
          type="button"
          onClick={close}
          className="kid-card min-h-20 min-w-48 px-10 font-display text-3xl font-extrabold outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
