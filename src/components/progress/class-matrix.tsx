"use client";

import { Fragment, useOptimistic, useState, useTransition } from "react";
import { bulkSetProgressAction, setProgressAction } from "@/app/ogretmen/progress-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  NOT_STARTED,
  nextStars,
  nextStatus,
  progressKey,
  STATUS_LABEL,
  type ProgressState,
} from "@/lib/progress";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/server/db/schema";
import type { SubjectNode } from "@/server/services/curriculum";
import { StatusIcon, StatusLegend } from "./status-icon";

type Student = { id: string; firstName: string; lastInitial: string | null };
type Update = { keys: string[]; value: (current: ProgressState) => ProgressState };

type Props = {
  classId: string;
  subject: SubjectNode;
  students: Student[];
  progress: Record<string, ProgressState>;
};

export function ClassMatrix({ classId, subject, students, progress }: Props) {
  const [optimistic, applyOptimistic] = useOptimistic(progress, (state, update: Update) => {
    const next = { ...state };
    for (const key of update.keys) next[key] = update.value(state[key] ?? NOT_STARTED);
    return next;
  });
  const [, start] = useTransition();
  const [starMode, setStarMode] = useState(false);
  const [selectRows, setSelectRows] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stages = subject.topics.flatMap((t) => t.stages);
  const state = (studentId: string, stageId: string) => optimistic[progressKey(studentId, stageId)] ?? NOT_STARTED;

  function onCell(s: Student, stage: { id: string; name: string }) {
    const current = state(s.id, stage.id);
    let next: ProgressState;
    if (starMode) {
      if (current.status !== "completed") {
        setMessage("Yıldız yalnızca tamamlanan duraklara verilir. Önce yıldız modunu kapatıp durağı tamamlandı yapın.");
        return;
      }
      next = { status: "completed", stars: nextStars(current.stars) };
    } else {
      next = { status: nextStatus(current.status), stars: null };
    }
    setMessage(null);
    start(async () => {
      applyOptimistic({ keys: [progressKey(s.id, stage.id)], value: () => next });
      const result = await setProgressAction(classId, { studentId: s.id, stageId: stage.id, ...next });
      if (!result.ok) setMessage(result.error);
    });
  }

  function onBulk(status: ProgressStatus, target: "all" | "selected") {
    if (!bulkStage) return;
    const stageId = bulkStage.id;
    const ids = target === "all" ? students.map((s) => s.id) : [...selected];
    setBulkStage(null);
    setMessage(null);
    start(async () => {
      applyOptimistic({
        keys: ids.map((id) => progressKey(id, stageId)),
        value: (current) =>
          status === "completed" && current.status === "completed" ? current : { status, stars: null },
      });
      const result = await bulkSetProgressAction(classId, {
        stageId,
        studentIds: target === "all" ? "all" : ids,
        status,
      });
      setMessage(result.ok ? (result.message ?? null) : result.error);
    });
  }

  if (stages.length === 0) {
    return <p className="text-muted-foreground">Bu derste henüz durak yok. Duraklar sekmesinden ekleyin.</p>;
  }
  if (students.length === 0) return <p className="text-muted-foreground">Sınıfta aktif öğrenci yok.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={starMode ? "default" : "outline"}
          className="h-11"
          aria-pressed={starMode}
          onClick={() => setStarMode(!starMode)}
        >
          ★ Yıldız modu {starMode ? "açık" : "kapalı"}
        </Button>
        <Button
          variant={selectRows ? "default" : "outline"}
          className="h-11"
          aria-pressed={selectRows}
          onClick={() => {
            setSelectRows(!selectRows);
            setSelected(new Set());
          }}
        >
          {selectRows ? `Öğrenci seçimi (${selected.size})` : "Öğrenci seç"}
        </Button>
        <StatusLegend />
      </div>
      <p className="text-sm text-muted-foreground">
        {starMode
          ? "Tamamlanmış bir hücreye dokunarak 0–3 yıldız verin."
          : "Hücreye dokunun: Başlamadı → Devam ediyor → Tamamlandı. Toplu işaretlemek için durak başlığına dokunun."}
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}

      <div className="max-w-full overflow-x-auto rounded-xl border">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-36 border-b bg-background p-2 text-left align-bottom">
                Öğrenci
              </th>
              {subject.topics.map((t) =>
                t.stages.length === 0 ? null : (
                  <th key={t.id} colSpan={t.stages.length} className="border-b border-l px-2 py-1 text-left font-medium">
                    {t.name}
                  </th>
                ),
              )}
            </tr>
            <tr>
              {subject.topics.map((t) =>
                t.stages.map((stage, i) => (
                  <th key={stage.id} scope="col" className={cn("border-b p-0 align-bottom", i === 0 && "border-l")}>
                    <button
                      type="button"
                      onClick={() => setBulkStage(stage)}
                      title={stage.name}
                      aria-label={`${stage.name}: toplu işaretle`}
                      className="flex max-h-40 min-h-24 w-12 items-end justify-center p-1 text-xs font-normal hover:bg-accent [writing-mode:vertical-rl] rotate-180"
                    >
                      <span className="line-clamp-2">{stage.name}</span>
                    </button>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const name = formatStudentName(s);
              return (
                <tr key={s.id} className="border-b last:border-b-0">
                  <th scope="row" className="sticky left-0 z-10 bg-background p-0 text-left font-medium">
                    {selectRows ? (
                      <label className="flex min-h-12 items-center gap-2 px-2">
                        <input
                          type="checkbox"
                          className="size-5"
                          checked={selected.has(s.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(s.id);
                              else next.delete(s.id);
                              return next;
                            })
                          }
                        />
                        {name}
                      </label>
                    ) : (
                      <span className="flex min-h-12 items-center px-2">{name}</span>
                    )}
                  </th>
                  {subject.topics.map((t) =>
                    t.stages.map((stage, i) => {
                      const cell = state(s.id, stage.id);
                      return (
                        <td key={stage.id} className={cn("p-0 text-center", i === 0 && "border-l")}>
                          <button
                            type="button"
                            onClick={() => onCell(s, stage)}
                            aria-label={`${name} · ${stage.name} · ${STATUS_LABEL[cell.status]}${cell.stars ? ` · ${cell.stars} yıldız` : ""}`}
                            className="flex size-12 items-center justify-center hover:bg-accent"
                          >
                            <StatusIcon state={cell} />
                          </button>
                        </td>
                      );
                    }),
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <th scope="row" className="sticky left-0 z-10 bg-background p-2 text-left text-xs font-normal text-muted-foreground">
                Tamamlayan
              </th>
              {subject.topics.map((t) => (
                <Fragment key={t.id}>
                  {t.stages.map((stage, i) => (
                    <td key={stage.id} className={cn("p-1 text-center text-xs text-muted-foreground", i === 0 && "border-l")}>
                      {students.filter((s) => state(s.id, stage.id).status === "completed").length}/{students.length}
                    </td>
                  ))}
                </Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <Dialog open={bulkStage !== null} onOpenChange={(open) => !open && setBulkStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkStage?.name}</DialogTitle>
            <DialogDescription>Bu durağı birden çok öğrenci için aynı anda işaretleyin.</DialogDescription>
          </DialogHeader>
          {(selected.size > 0 ? (["all", "selected"] as const) : (["all"] as const)).map((target) => (
            <section key={target} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {target === "all" ? `Tüm sınıf (${students.length})` : `Seçili ${selected.size} öğrenci`}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["completed", "in_progress", "not_started"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={status === "completed" ? "default" : "outline"}
                    className="h-11"
                    onClick={() => onBulk(status, target)}
                  >
                    {STATUS_LABEL[status]}
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
