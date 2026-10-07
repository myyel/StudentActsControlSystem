"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = { label: string; className?: string; children: ReactNode };

/**
 * A single row of `<li>` items that scrolls sideways: by touch, by dragging with the mouse, and
 * with the arrow keys once focused (a scrollable region must be keyboard reachable).
 */
export function DragScrollRow({ label, className, children }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);

  // Touch and pen already scroll natively; only the mouse needs help.
  const start = (e: PointerEvent<HTMLUListElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    // Snapping would fight the pointer while it moves.
    el.style.scrollSnapType = "none";
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  const move = (e: PointerEvent<HTMLUListElement>) => {
    const el = ref.current;
    if (!el || !drag.current) return;
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };

  const end = (e: PointerEvent<HTMLUListElement>) => {
    const el = ref.current;
    if (!el || !drag.current) return;
    drag.current = null;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    el.style.scrollSnapType = "";
    el.style.cursor = "";
    el.style.userSelect = "";
  };

  return (
    <ul
      ref={ref}
      aria-label={label}
      tabIndex={0}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn(
        // `relative`: sr-only text inside off-screen cards is absolutely positioned; without a positioned
        // scroller it escapes the clipping and widens the whole page in Chrome.
        "relative flex cursor-grab snap-x gap-5 overflow-x-auto rounded-[1.75rem] pb-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {children}
    </ul>
  );
}
