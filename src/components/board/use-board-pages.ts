"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/** How long a page of students stays on the board before sliding to the next. */
export const PAGE_MS = 10_000;

/**
 * How many student cards fit the visible board without scrolling. Measures the first page's
 * grid (columns from the CSS breakpoints, one card's height) against the viewport, and
 * re-measures on resize, fullscreen changes and font loading. Until measured, every card is
 * on one page.
 */
export function useCardsPerPage(viewportRef: RefObject<HTMLElement | null>, total: number) {
  const [perPage, setPerPage] = useState(total);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function measure() {
      const grid = viewport!.querySelector<HTMLElement>("[data-board-page]");
      const card = grid?.querySelector<HTMLElement>("li");
      if (!grid || !card) return;
      const style = getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const gap = parseFloat(style.rowGap) || 0;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const rowHeight = card.getBoundingClientRect().height + gap;
      const rows = Math.max(1, Math.floor((viewport!.clientHeight - padding + gap) / rowHeight));
      setPerPage(Math.max(1, cols * rows));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const card = viewport.querySelector("li");
    if (card) observer.observe(card);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [viewportRef, total]);

  return Math.min(perPage, Math.max(total, 1));
}

/** Advances `page` every PAGE_MS while not paused; a manual page change restarts the wait. */
export function useAutoAdvance(page: number, pageCount: number, paused: boolean, setPage: (page: number) => void) {
  useEffect(() => {
    if (paused || pageCount <= 1) return;
    const timer = setTimeout(() => setPage((page + 1) % pageCount), PAGE_MS);
    return () => clearTimeout(timer);
  }, [page, pageCount, paused, setPage]);
}
