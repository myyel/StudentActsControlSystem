"use client";

import { Archive, BookOpen, Pencil, Plus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  createNodeAction,
  renameNodeAction,
  reorderAction,
  setNodeArchivedAction,
  setSubjectGradeLevelAction,
} from "@/app/ogretmen/curriculum-actions";
import { GradeLevelSelect } from "@/components/classes/grade-level-select";
import { selectClassName } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NodeKind, SubjectNode, TopicNode } from "@/server/services/curriculum";
import { SortableHandle, SortableList } from "./sortable-list";

/**
 * Children sit under their parent's header. Below xl they use the full width (three handle-wide
 * indents would leave a phone no room for stage names); from xl they line up after the handle.
 */
const CHILDREN = "flex flex-col pl-1 xl:pl-12";

/** Per-subject colour set; bright tones are fills only, text uses the AA "ink" shades. */
const TONES = [
  { icon: "bg-grass-soft text-grass-strong", topic: "bg-grass-soft/60 border-grass", badge: "border-grass text-grass-strong" },
  { icon: "bg-sky-soft text-sky-ink", topic: "bg-sky-soft/60 border-sky", badge: "border-sky text-sky-ink" },
  { icon: "bg-lav-soft text-lav-ink", topic: "bg-lav-soft/60 border-lav", badge: "border-lav text-lav-ink" },
  { icon: "bg-sun-soft text-ink", topic: "bg-sun-soft/60 border-sun", badge: "border-sun-press text-ink" },
] as const;
type Tone = (typeof TONES)[number];

/** Stable colour per subject, so it does not jump around while reordering. */
function toneFor(id: string): Tone {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? TONES[0];
}

const LABEL: Record<NodeKind, string> = { subject: "Ders", topic: "Konu", stage: "Durak" };
const PLACEHOLDER: Record<NodeKind, string> = {
  subject: "Örn. Matematik",
  topic: "Örn. Toplama işlemi",
  stage: "Örn. Onluk bozmadan toplama",
};

const reorder = (kind: NodeKind, parentId: string) => async (ids: string[]) => {
  const result = await reorderAction(kind, parentId, ids);
  return result.ok ? null : result.error;
};

/** Single-field form used for adding and renaming. */
function NameForm({
  kind,
  action,
  defaultValue,
  submitLabel,
  onDone,
  autoFocus,
  extra,
}: {
  kind: NodeKind;
  action: (prev: unknown, formData: FormData) => ReturnType<typeof createNodeAction>;
  defaultValue?: string;
  submitLabel: string;
  onDone?: () => void;
  autoFocus?: boolean;
  /** Extra fields under the name (the grade of a new subject in combined classes). */
  extra?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone?.();
    return result;
  }, null);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          name="name"
          defaultValue={defaultValue}
          placeholder={PLACEHOLDER[kind]}
          aria-label={`${LABEL[kind]} adı`}
          required
          autoFocus={autoFocus}
          maxLength={kind === "subject" ? 60 : 80}
          className="h-11"
        />
        <Button type="submit" disabled={pending} className="h-11 shrink-0">
          {submitLabel}
        </Button>
      </div>
      {extra}
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

const NAME_CLASS: Record<NodeKind, string> = {
  subject: "font-display text-xl font-bold leading-tight",
  topic: "text-base font-bold",
  stage: "",
};

/** Name with rename and archive controls. */
function NodeHeader({
  kind,
  id,
  name,
  leading,
  meta,
}: {
  kind: NodeKind;
  id: string;
  name: string;
  /** Icon or order badge before the name. */
  leading?: React.ReactNode;
  /** Short summary under the name, e.g. child counts. */
  meta?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <div className="flex items-start gap-1">
        <SortableHandle />
        <div className="min-w-0 flex-1">
          <NameForm
            kind={kind}
            action={renameNodeAction.bind(null, kind, id)}
            defaultValue={name}
            submitLabel="Kaydet"
            onDone={() => setEditing(false)}
            autoFocus
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-11 items-center gap-1">
      <SortableHandle />
      {leading}
      <div className={cn("flex min-w-0 flex-1 flex-col", leading && "ml-2")}>
        <span className={cn("break-words", NAME_CLASS[kind])}>{name}</span>
        {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
      </div>
      <Button variant="ghost" size="icon" className="size-11" aria-label={`${name}: adını değiştir`} onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={`${name}: arşivle`}
        disabled={pending}
        onClick={() => start(async () => void (await setNodeArchivedAction(kind, id, true)))}
      >
        <Archive />
      </Button>
    </div>
  );
}

function AddChild({ kind, parentId, gradeLevels = [] }: { kind: NodeKind; parentId: string; gradeLevels?: number[] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" className="h-11 self-start" onClick={() => setOpen(true)}>
        <Plus /> {LABEL[kind]} ekle
      </Button>
    );
  }
  return (
    <NameForm
      kind={kind}
      action={createNodeAction.bind(null, kind, parentId)}
      submitLabel="Ekle"
      onDone={() => setOpen(false)}
      autoFocus
      extra={
        kind === "subject" && (
          <GradeLevelSelect id="new-subject-grade" gradeLevels={gradeLevels} label="Hangi düzey için?" allOption="Tüm düzeyler" />
        )
      }
    />
  );
}

function TopicBlock({ topic, tone }: { topic: TopicNode; tone: Tone }) {
  return (
    <div className="flex flex-col gap-2 pb-1">
      <NodeHeader
        kind="topic"
        id={topic.id}
        name={topic.name}
        meta={topic.stages.length > 0 ? `${topic.stages.length} durak` : "Henüz durak yok"}
      />
      <div className={cn(CHILDREN, "gap-2")}>
        {topic.stages.length > 0 && (
          <SortableList
            key={topic.stages.map((s) => s.id).join()}
            items={topic.stages}
            onReorder={reorder("stage", topic.id)}
            rowClassName="rounded-xl border bg-card shadow-xs"
            renderItem={(s, index) => (
              <NodeHeader
                kind="stage"
                id={s.id}
                name={s.name}
                leading={
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-card text-sm font-bold",
                      tone.badge,
                    )}
                  >
                    {index + 1}
                  </span>
                }
              />
            )}
          />
        )}
        <AddChild kind="stage" parentId={topic.id} />
      </div>
    </div>
  );
}

/** Combined classes: which grade's students follow this subject (matrix and parents' roadmap). */
function SubjectGrade({ subject, gradeLevels }: { subject: SubjectNode; gradeLevels: number[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const id = `subject-grade-${subject.id}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        Düzey
      </label>
      <select
        id={id}
        defaultValue={subject.gradeLevel ?? ""}
        disabled={pending}
        className={selectClassName.replace("w-full", "w-auto")}
        onChange={(e) => {
          const value = e.target.value;
          start(async () => {
            const result = await setSubjectGradeLevelAction(subject.id, value);
            setError(result.ok ? null : result.error);
          });
        }}
      >
        <option value="">Tüm düzeyler</option>
        {gradeLevels.map((g) => (
          <option key={g} value={g}>
            {g}. sınıf
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function SubjectBlock({ subject, gradeLevels }: { subject: SubjectNode; gradeLevels: number[] }) {
  const tone = toneFor(subject.id);
  const stageCount = subject.topics.reduce((sum, t) => sum + t.stages.length, 0);
  return (
    <div className="flex flex-col gap-3 py-2">
      <NodeHeader
        kind="subject"
        id={subject.id}
        name={subject.name}
        meta={`${subject.topics.length} konu · ${stageCount} durak`}
        leading={
          <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone.icon)}>
            <BookOpen className="size-6" />
          </span>
        }
      />
      <div className={cn(CHILDREN, "gap-3")}>
        {gradeLevels.length > 1 && <SubjectGrade subject={subject} gradeLevels={gradeLevels} />}
        {subject.topics.length > 0 && (
          <SortableList
            key={subject.topics.map((t) => t.id).join()}
            items={subject.topics}
            onReorder={reorder("topic", subject.id)}
            className="gap-3"
            rowClassName={cn("rounded-xl border-l-4", tone.topic)}
            renderItem={(t) => <TopicBlock topic={t} tone={tone} />}
          />
        )}
        <AddChild kind="topic" parentId={subject.id} />
      </div>
    </div>
  );
}

export function CurriculumEditor({
  classId,
  gradeLevels,
  subjects,
}: {
  classId: string;
  /** The class's levels; combined classes can tie a subject to one grade. */
  gradeLevels: number[];
  subjects: SubjectNode[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {subjects.length === 0 ? (
        <p className="text-muted-foreground">Henüz ders yok. Önce bir ders ekleyin, sonra konuları ve durakları.</p>
      ) : (
        <SortableList
          key={subjects.map((s) => s.id).join()}
          items={subjects}
          onReorder={reorder("subject", classId)}
          renderItem={(s) => <SubjectBlock subject={s} gradeLevels={gradeLevels} />}
          className="gap-5"
          rowClassName="rounded-2xl border bg-card p-1 shadow-sm sm:p-2"
        />
      )}
      <AddChild kind="subject" parentId={classId} gradeLevels={gradeLevels} />
    </div>
  );
}
