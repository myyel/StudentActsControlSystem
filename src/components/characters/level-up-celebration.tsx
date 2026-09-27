"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LevelUp } from "@/server/services/character";
import { CharacterImage } from "./character-image";

export type Celebration = { studentName: string; levelUp: LevelUp };

const SHOW_MS = 4500;
const COLORS = ["#ffca28", "#ef5350", "#42a5f5", "#66bb6a", "#ab47bc", "#ff7043"];
// Fixed spread so every celebration looks the same (and renders the same on every device).
const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 140 + (i % 3) * 50;
  return {
    color: COLORS[i % COLORS.length]!,
    style: {
      "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
      "--dy": `${Math.round(Math.sin(angle) * distance + 120)}px`,
      "--rot": `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
    } as CSSProperties,
  };
});

type Props = {
  items: Celebration[];
  onDone: () => void;
  /** Board mode: bigger picture, text and button. */
  large?: boolean;
};

/** Evolution animation, one student at a time; tap or wait to continue. Reduced motion shows a plain swap. */
export function LevelUpCelebration({ items, onDone, large }: Props) {
  const [index, setIndex] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const current = items[index];

  const next = useCallback(() => {
    if (index + 1 < items.length) setIndex(index + 1);
    else onDone();
  }, [index, items.length, onDone]);

  useEffect(() => {
    button.current?.focus();
    const timer = setTimeout(next, SHOW_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [next, onDone]);

  if (!current) return null;
  const { studentName, levelUp } = current;
  const size = large ? 320 : 200;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={next}
    >
      <div
        key={index}
        className="flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl bg-background p-6 text-center shadow-xl motion-safe:animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <CharacterImage
            stage={levelUp.from}
            size={size}
            decorative
            className="absolute motion-reduce:hidden motion-safe:animate-evolve-out"
          />
          <CharacterImage stage={levelUp.to} size={size} className="relative motion-safe:animate-evolve-in" />
          <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 motion-reduce:hidden">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className={cn("absolute block size-3 rounded-sm motion-safe:animate-confetti", i % 3 === 0 && "rounded-full")}
                style={{ ...c.style, backgroundColor: c.color }}
              />
            ))}
          </div>
        </div>
        <div aria-live="polite">
          <p id="level-up-title" className={cn("font-bold", large ? "text-5xl" : "text-2xl")}>
            {studentName} seviye atladı!
          </p>
          <p className={cn("mt-2 text-muted-foreground", large ? "text-3xl" : "text-lg")}>
            {levelUp.toLevel}. seviye: {levelUp.to.name}
          </p>
        </div>
        <Button ref={button} onClick={next} className={cn(large ? "h-20 px-10 text-3xl" : "h-11 px-6 text-base")}>
          {index + 1 < items.length ? "Sıradaki" : "Harika!"}
        </Button>
      </div>
    </div>
  );
}
