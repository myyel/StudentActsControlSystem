import type { CSSProperties } from "react";
import { MAX_LEVEL } from "@/lib/character";
import { cn } from "@/lib/utils";
import { CharacterImage } from "./character-image";

// Ring colours per built-in type (the slug is in the asset url); others use the brand green.
const RING: Record<string, string> = {
  ejderha: "#2fa85a",
  baykus: "#b7835a",
  robot: "#2e7fd6",
  tohum: "#3fa34d",
  kedi: "#e98a2e",
  tavsan: "#e27fa3",
  penguen: "#3d5a80",
  tilki: "#e8642c",
  kaplumbaga: "#3f9a55",
  ahtapot: "#8b5fe0",
};
const GOLD = "#f5b400";

export function characterTone(assetUrl: string) {
  const slug = /\/characters\/([^/]+)\//.exec(assetUrl)?.[1] ?? "";
  return RING[slug] ?? "#079669";
}

type Props = {
  stage: { name: string; assetUrl: string };
  /** Pixels; a class like `2xl:[--avatar:9rem]` can override it per breakpoint. */
  size: number;
  /** Shown as a ring around the picture: progress to the next level (0–1). */
  progress?: number;
  level?: number;
  /** The class's level count (PRD §4.6); reaching it gives the gold ring. */
  maxLevel?: number;
  className?: string;
  /** Screen reader text, e.g. "Ada Y., Kanatlı ejderha, 4. seviye". Omit when written next to it. */
  label?: string;
};

const STROKE = 6; // of a 100 unit box
const RADIUS = 50 - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A character with an optional progress ring (no numbers: children see it). The last level gets a
 * full gold ring.
 */
export function CharacterAvatar({ stage, size, progress, level, maxLevel = MAX_LEVEL, className, label }: Props) {
  const ring = progress !== undefined;
  const done = level !== undefined && level >= maxLevel;
  const value = done ? 1 : Math.min(1, Math.max(0, progress ?? 0));

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // A class such as `2xl:[--avatar:9rem]` wins over the size prop (inline style would not).
      className={cn("relative inline-flex size-[var(--avatar,var(--avatar-base))] shrink-0 items-center justify-center", className)}
      style={{ "--avatar-base": `${size}px` } as CSSProperties}
    >
      {ring && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx={50} cy={50} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-line" />
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={done ? GOLD : characterTone(stage.assetUrl)}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - value)}
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
      )}
      <CharacterImage stage={stage} size={size} decorative className={cn("h-auto", ring ? "w-[84%]" : "w-full")} />
    </span>
  );
}

const STAR = "M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z";

/**
 * Level as one star per level of the class, filled up to the level (a student above a lowered
 * level count shows all filled). SVG so no glyph text reaches contrast checks.
 */
export function LevelStars({
  level,
  maxLevel = MAX_LEVEL,
  size = 16,
  className,
}: {
  level: number;
  maxLevel?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span role="img" aria-label={`${level}. seviye`} className={cn("inline-flex gap-0.5", className)}>
      {Array.from({ length: maxLevel }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d={STAR} className={i < level ? "fill-sun stroke-sun-press" : "fill-line stroke-line"} strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
