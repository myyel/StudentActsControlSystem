"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Mouse movement before a press turns into a drag; below it, a click stays a click. */
const DRAG_THRESHOLD_PX = 5;

/**
 * Lets a mouse user grab a horizontally scrollable box and drag it sideways (touch already
 * scrolls natively). The drag may start anywhere, even on a button: once it has moved, the
 * click that ends it is swallowed so a cell is not toggled by accident, and `onDragStart`
 * lets the caller cancel a pending long press. Returns whether a drag is in progress.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, onDragStart?: () => void) {
  const [dragging, setDragging] = useState(false);
  const onDragStartRef = useRef(onDragStart);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    let start: { x: number; scrollLeft: number } | null = null;
    let moved = false;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0 || box!.scrollWidth <= box!.clientWidth) return;
      // Form fields keep their own mouse behaviour (checkbox labels in "Öğrenci seç" mode).
      if ((e.target as Element).closest("input, label, select, textarea")) return;
      start = { x: e.clientX, scrollLeft: box!.scrollLeft };
      moved = false;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    }

    function onPointerMove(e: PointerEvent) {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        onDragStartRef.current?.();
      }
      box!.scrollLeft = start.scrollLeft - dx;
      // No text selection while dragging.
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      start = null;
      if (!moved) return;
      setDragging(false);
      // The ending click (if the mouse was released over the box) fires right after pointerup;
      // a drag released elsewhere has none, so the flag must not wait for it.
      setTimeout(() => (moved = false), 0);
    }

    // The click that ends a drag must not toggle the cell under the mouse.
    function onClickCapture(e: MouseEvent) {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
    }

    box.addEventListener("pointerdown", onPointerDown);
    box.addEventListener("click", onClickCapture, true);
    return () => {
      box.removeEventListener("pointerdown", onPointerDown);
      box.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [ref]);

  return dragging;
}
