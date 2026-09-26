// Shared by client and server.
import type { ProgressStatus } from "@/server/db/schema";

export type ProgressState = { status: ProgressStatus; stars: number | null };

export const NOT_STARTED: ProgressState = { status: "not_started", stars: null };

/** Tap in the matrix: Başlamadı → Devam ediyor → Tamamlandı → Başlamadı. */
export function nextStatus(status: ProgressStatus): ProgressStatus {
  return status === "not_started" ? "in_progress" : status === "in_progress" ? "completed" : "not_started";
}

/** Tap in star mode on a completed stage: 0 → 1 → 2 → 3 → 0. */
export const nextStars = (stars: number | null) => ((stars ?? 0) + 1) % 4;

export const STATUS_LABEL: Record<ProgressStatus, string> = {
  not_started: "Başlamadı",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
};

export const progressKey = (studentId: string, stageId: string) => `${studentId}:${stageId}`;
