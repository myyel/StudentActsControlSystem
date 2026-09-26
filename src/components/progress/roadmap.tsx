import { STATUS_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { RoadmapSubject } from "@/server/services/progress";

/**
 * A path of stages per subject. Only the child's own progress is shown: no negatives,
 * no comparisons with classmates (CLAUDE.md rule 7).
 */
export function Roadmap({ subjects }: { subjects: RoadmapSubject[] }) {
  if (subjects.length === 0) {
    return <p className="text-muted-foreground">Öğretmen henüz ders durakları eklemedi.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {subjects.map((s) => {
        const percent = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
        return (
          <section key={s.id} className="flex flex-col gap-4 rounded-2xl border p-4">
            <header className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{s.name}</h2>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={s.total}
                aria-valuenow={s.completed}
                aria-label={`${s.name}: ${s.total} duraktan ${s.completed} tamamlandı`}
                className="h-3 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">
                {s.completed} / {s.total} durak tamamlandı
              </p>
            </header>

            {s.topics.map((t) => (
              <div key={t.id} className="flex flex-col gap-1">
                <h3 className="font-medium">{t.name}</h3>
                <ol className="relative ml-4 border-l-2 border-dashed border-muted-foreground/30">
                  {t.stages.map((st) => (
                    <li
                      key={st.id}
                      className={cn("relative flex min-h-11 items-center gap-3 py-1 pl-6", st.status === "not_started" && "opacity-55")}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[11px] flex size-5 items-center justify-center rounded-full border-2 bg-background text-[10px] text-white",
                          st.status === "completed" && "border-emerald-600 bg-emerald-600",
                          st.status === "in_progress" && "size-6 -left-[13px] border-amber-500 ring-4 ring-amber-200 dark:ring-amber-900",
                          st.status === "not_started" && "border-muted-foreground/40",
                        )}
                      >
                        {st.status === "completed" && "✓"}
                      </span>
                      <span className={cn("min-w-0 flex-1", st.status === "in_progress" && "font-semibold")}>{st.name}</span>
                      {st.status === "in_progress" && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          Şu an burada
                        </span>
                      )}
                      {st.status === "completed" && st.stars ? (
                        <span className="shrink-0 text-amber-500" aria-label={`${st.stars} yıldız`}>
                          {"★".repeat(st.stars)}
                        </span>
                      ) : null}
                      <span className="sr-only">{STATUS_LABEL[st.status]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
