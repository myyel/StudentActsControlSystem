import { BookOpen, Check } from "lucide-react";
import { STATUS_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { RoadmapStage, RoadmapSubject } from "@/server/services/progress";
import { Stars } from "./status-icon";

/** Per-subject colour; bright tones are fills only, text stays ink for AA contrast. */
const TONES = [
  { band: "bg-sky-soft", badge: "bg-sky" },
  { band: "bg-grass-soft", badge: "bg-grass" },
  { band: "bg-lav-soft", badge: "bg-lav" },
  { band: "bg-sun-soft", badge: "bg-sun" },
] as const;

/**
 * A path of stages per subject. Only the child's own progress is shown: no negatives,
 * no comparisons with classmates (CLAUDE.md rule 7).
 */
export function Roadmap({ subjects }: { subjects: RoadmapSubject[] }) {
  if (subjects.length === 0) {
    return <p className="text-muted-foreground">Öğretmen henüz ders durakları eklemedi.</p>;
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-2">
      {subjects.map((s, i) => {
        const tone = TONES[i % TONES.length]!;
        const percent = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
        return (
          <section key={s.id} className="overflow-hidden rounded-[1.75rem] bg-card shadow-[0_6px_0_var(--kid-shadow)]">
            <header className={cn("flex flex-col gap-3 p-4 sm:p-5", tone.band)}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl text-ink shadow-[0_3px_0_rgb(0_0_0/0.12)]",
                    tone.badge,
                  )}
                >
                  <BookOpen className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl leading-tight font-extrabold">{s.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {s.completed} / {s.total} durak tamamlandı
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-card px-3 py-1 text-sm font-extrabold">%{percent}</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={s.total}
                aria-valuenow={s.completed}
                aria-label={`${s.name}: ${s.total} duraktan ${s.completed} tamamlandı`}
                className="h-4 overflow-hidden rounded-full bg-card"
              >
                <div className="h-full rounded-full bg-grass" style={{ width: `${percent}%` }} />
              </div>
            </header>

            <div className="flex flex-col gap-5 p-4 sm:p-5">
              {s.topics.length === 0 && <p className="text-sm text-muted-foreground">Bu derste henüz durak yok.</p>}
              {s.topics.map((t) => {
                const done = t.stages.filter((st) => st.status === "completed").length;
                return (
                  <div key={t.id} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-extrabold">{t.name}</h3>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {done}/{t.stages.length}
                      </span>
                    </div>
                    {t.stages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Bu konuda henüz durak yok.</p>
                    ) : (
                      <ol className="flex flex-col gap-2">
                        {t.stages.map((st) => (
                          <StageRow key={st.id} stage={st} />
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StageRow({ stage }: { stage: RoadmapStage }) {
  const { status, stars, name } = stage;
  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2",
        status === "completed" && "bg-grass-soft",
        status === "in_progress" && "border-2 border-sun bg-sun-soft",
        status === "not_started" && "border-2 border-dashed border-input",
      )}
    >
      {status === "completed" ? (
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grass-strong text-white">
          <Check className="size-5" strokeWidth={3.5} />
        </span>
      ) : status === "in_progress" ? (
        <span aria-hidden className="block size-9 shrink-0 rounded-full border-[5px] border-sun bg-white" />
      ) : (
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          ☁️
        </span>
      )}
      <span
        className={cn(
          "min-w-0 flex-1 break-words",
          status === "not_started" ? "text-muted-foreground" : "font-bold",
        )}
      >
        {name}
      </span>
      {status === "in_progress" && (
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
          Şu an burada
        </span>
      )}
      {status === "completed" && stars ? <Stars count={stars} className="shrink-0 [&_svg]:size-4" /> : null}
      <span className="sr-only">
        {STATUS_LABEL[status]}
        {stars ? `, ${stars} yıldız` : ""}
      </span>
    </li>
  );
}
