"use client";

import { Check, List, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { CharacterImage } from "@/components/characters/character-image";
import { STATUS_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { RoadmapStage, RoadmapSubject } from "@/server/services/progress";
import { ISLAND_EMOJI, ISLAND_THEMES, IslandScene, SCENE_BAND, islandBackground } from "./island-scene";
import { Roadmap } from "./roadmap";
import { Stars } from "./status-icon";

type Props = { subjects: RoadmapSubject[]; stage: { name: string; assetUrl: string }; childName: string };

const ROW = 92; // px per stop
const XS = [24, 64, 34, 72, 44]; // winding path, % of the island width

/**
 * The roadmap as an adventure: subject tabs, topics as islands, stops on a dashed path, the
 * child's own character on "şu an burada", future stops under clouds (not locks: "not yet
 * discovered", not "forbidden"). Only this child's progress; no classmates. The list stays.
 */
export function AdventureMap({ subjects, stage, childName }: Props) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id);
  const [view, setView] = useState<"map" | "list">("map");
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  if (!subject) return <p className="text-muted-foreground">Öğretmen henüz ders durakları eklemedi.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Görünüm" className="flex gap-1 rounded-full bg-card p-1 shadow-[0_3px_0_var(--kid-shadow)]">
          {(["map", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold",
                view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {v === "map" ? <MapIcon aria-hidden className="size-4" /> : <List aria-hidden className="size-4" />}
              {v === "map" ? "Harita" : "Liste"}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <Roadmap subjects={subjects} />
      ) : (
        <>
          <div role="group" aria-label="Ders" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === subject.id}
                onClick={() => setSubjectId(s.id)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold",
                  s.id === subject.id
                    ? "bg-primary text-primary-foreground shadow-[0_3px_0_rgb(0_0_0/0.15)]"
                    : "bg-card shadow-[0_3px_0_var(--kid-shadow)] hover:bg-accent",
                )}
              >
                {s.name}
                <span className={s.id === subject.id ? "" : "text-grass-strong"}>
                  {s.completed}/{s.total}
                </span>
              </button>
            ))}
          </div>

          <h2 className="sr-only">{subject.name}</h2>
          {subject.topics.length === 0 && <p className="text-muted-foreground">Bu derste henüz durak yok.</p>}
          {subject.topics.map((t, i) => {
            const theme = ISLAND_THEMES[i % ISLAND_THEMES.length]!;
            return (
              <section
                key={t.id}
                aria-labelledby={`island-${t.id}`}
                className={cn(
                  "relative isolate overflow-hidden rounded-[2.5rem] p-4 shadow-[0_6px_0_var(--kid-shadow)]",
                  islandBackground(theme),
                )}
                style={{ paddingBottom: SCENE_BAND }}
              >
                <IslandScene theme={theme} />
                <h3
                  id={`island-${t.id}`}
                  className="relative inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-1.5 font-display text-lg font-extrabold shadow-[0_3px_0_rgb(0_0_0/0.08)]"
                >
                  <span aria-hidden>{ISLAND_EMOJI[theme]}</span>
                  {t.name}
                </h3>
                <Path stages={t.stages} stage={stage} childName={childName} />
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function Path({ stages, stage, childName }: { stages: RoadmapStage[]; stage: Props["stage"]; childName: string }) {
  if (stages.length === 0) {
    return <p className="relative mt-3 w-fit rounded-xl bg-card/90 px-3 py-1.5 text-sm text-muted-foreground">Bu konuda henüz durak yok.</p>;
  }
  const height = stages.length * ROW;
  const points = stages.map((_, i) => [XS[i % XS.length]!, i * ROW + ROW / 2] as const);

  return (
    <ol className="relative" style={{ height }}>
      <svg aria-hidden className="absolute inset-0 size-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          strokeWidth={6}
          strokeDasharray="1 11"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-white"
        />
      </svg>
      {stages.map((st, i) => {
        const [x, y] = points[i]!;
        const left = x < 50;
        return (
          <li key={st.id} className="absolute inset-x-0" style={{ top: y - ROW / 2, height: ROW }}>
            <span
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${x}%` }}
            >
              <Node stage={st} />
              {st.status === "completed" && st.stars ? <Stars count={st.stars} className="mt-0.5" /> : null}
            </span>
            {st.status === "in_progress" && (
              // Stands next to the stop, on the side away from the label.
              <span
                className="absolute top-1/2 -translate-y-[80%] motion-safe:animate-hop"
                style={{ left: left ? `calc(${x}% - 82px)` : `calc(${x}% + 30px)` }}
              >
                <CharacterImage stage={stage} size={52} decorative className="drop-shadow" />
              </span>
            )}
            <span
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 flex-col gap-1",
                left ? "items-start text-left" : "items-end text-right",
              )}
              style={left ? { left: `calc(${x}% + 34px)`, right: 8 } : { right: `calc(${100 - x}% + 34px)`, left: 8 }}
            >
              <span
                className={cn(
                  "rounded-xl bg-card/90 px-2.5 py-1 leading-tight font-bold shadow-[0_2px_0_rgb(0_0_0/0.06)]",
                  st.status === "not_started" && "font-semibold text-muted-foreground",
                )}
              >
                {st.name}
              </span>
              {st.status === "in_progress" && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                  Şu an burada
                </span>
              )}
              <span className="sr-only">
                {STATUS_LABEL[st.status]}
                {st.stars ? `, ${st.stars} yıldız` : ""}
                {st.status === "in_progress" ? `, ${childName} burada` : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Node({ stage }: { stage: RoadmapStage }) {
  if (stage.status === "completed") {
    return (
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-grass-strong text-white shadow">
        <Check className="size-6" strokeWidth={3.5} />
      </span>
    );
  }
  if (stage.status === "in_progress") {
    return <span aria-hidden className="block size-14 rounded-full border-[6px] border-sun bg-white shadow-[0_0_0_6px_rgb(255_200_61/0.3)]" />;
  }
  return (
    <span aria-hidden className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50 bg-card/90 text-xl">
      ☁️
    </span>
  );
}
