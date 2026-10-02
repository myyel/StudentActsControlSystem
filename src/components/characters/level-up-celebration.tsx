"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { characterNoun } from "@/lib/character";
import { possessiveName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import type { LevelUp } from "@/server/services/character";
import { CharacterImage } from "./character-image";

/** `studentName` is the first name: the title reads "Deniz'in ejderhası büyüdü!". */
export type Celebration = { studentName: string; levelUp: LevelUp };

// Scenes: ① old form shakes and glows, ② light burst with the new form as a white silhouette,
// ③ new form + confetti. The window stays until "Harika!" (time to clap).
const SHAKE_MS = 1000;
const BURST_MS = 600;
const COLORS = ["#ffc83d", "#ff7a6b", "#4fa8ff", "#2dbe7e", "#9b7bff", "#ff8fb1"];
// Fixed spread so every celebration looks the same (and renders the same on every device).
const CONFETTI = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const distance = 150 + (i % 3) * 60;
  return {
    color: COLORS[i % COLORS.length]!,
    style: {
      "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
      "--dy": `${Math.round(Math.sin(angle) * distance + 140)}px`,
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

/** Evolution show, one student at a time. Reduced motion: a plain cross-fade to the new form. */
export function LevelUpCelebration({ items, onDone, large }: Props) {
  // Only mounted on the client (after a score), so the media query can be read right away.
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [index, setIndex] = useState(0);
  const [scene, setScene] = useState<1 | 2 | 3>(reduced ? 3 : 1);
  const button = useRef<HTMLButtonElement>(null);
  const current = items[index];

  const next = useCallback(() => {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setScene(reduced ? 3 : 1);
    } else onDone();
  }, [index, items.length, onDone, reduced]);

  useEffect(() => {
    if (reduced) return;
    const burst = setTimeout(() => setScene(2), SHAKE_MS);
    const reveal = setTimeout(() => setScene(3), SHAKE_MS + BURST_MS);
    return () => {
      clearTimeout(burst);
      clearTimeout(reveal);
    };
  }, [index, reduced]);

  useEffect(() => {
    if (scene === 3) button.current?.focus();
  }, [scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (!current) return null;
  const { studentName, levelUp } = current;
  const size = large ? 300 : 200;
  const title = `${possessiveName(studentName)} ${characterNoun(levelUp.to.assetUrl)} büyüdü!`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      // Above dialogs that are still animating closed.
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        key={index}
        className={cn(
          "relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-[2rem] p-6 text-center shadow-xl transition-colors duration-500",
          large ? "max-w-2xl" : "max-w-md",
          scene === 1 ? "bg-[#2b2d42] text-white" : "bg-[#fff1c9] text-[#2b2d42]",
        )}
      >
        {scene === 2 && (
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 motion-safe:animate-rays"
            style={{ background: "repeating-conic-gradient(#ffd96a 0 10deg, #fff6d6 10deg 20deg)" }}
          />
        )}
        {scene === 3 && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 35%, #fffaf0 0, #ffe7a3 70%)" }}
          />
        )}

        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          {scene === 1 && (
            <CharacterImage
              stage={levelUp.from}
              size={size}
              decorative
              className="motion-safe:animate-shake"
            />
          )}
          {scene === 2 && (
            // The new form only as a white silhouette: the surprise is kept for scene 3.
            <CharacterImage
              stage={levelUp.to}
              size={size}
              decorative
              className="brightness-0 invert motion-safe:animate-flash-in"
            />
          )}
          {scene === 3 && (
            <>
              {reduced && (
                <CharacterImage
                  stage={levelUp.from}
                  size={size}
                  decorative
                  className="absolute animate-out fade-out-0 fill-mode-forwards duration-600"
                />
              )}
              <CharacterImage
                stage={levelUp.to}
                size={size}
                className={cn("relative", reduced ? "animate-in fade-in-0 duration-600" : "animate-evolve-in")}
              />
              <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 motion-reduce:hidden">
                {CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    className={cn("absolute block size-3 rounded-sm motion-safe:animate-confetti", i % 3 === 0 && "rounded-full")}
                    style={{ ...c.style, backgroundColor: c.color }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div aria-live="polite" className="relative min-h-[1em]">
          {scene === 1 && <p className={cn("font-display font-extrabold", large ? "text-4xl" : "text-2xl")}>Bir şey oluyor… ✨</p>}
          {scene === 3 && (
            <>
              <p id="level-up-title" className={cn("font-display leading-tight font-extrabold", large ? "text-5xl" : "text-3xl")}>
                {title}
              </p>
              <p className={cn("mt-2 font-bold", large ? "text-3xl" : "text-lg")}>
                {levelUp.toLevel}. seviye · {levelUp.to.name}
              </p>
            </>
          )}
          {scene !== 3 && (
            <span id="level-up-title" className="sr-only">
              {title}
            </span>
          )}
        </div>

        {scene === 3 && (
          <button
            ref={button}
            type="button"
            onClick={next}
            className={cn(
              "relative rounded-2xl bg-[#2b2d42] font-extrabold text-white outline-none focus-visible:ring-[4px] focus-visible:ring-[#4fa8ff]",
              large ? "h-20 px-10 text-3xl" : "min-h-11 px-6 text-lg",
            )}
          >
            {index + 1 < items.length ? "Sıradaki" : "Harika! 🎉"}
          </button>
        )}
      </div>
    </div>
  );
}
