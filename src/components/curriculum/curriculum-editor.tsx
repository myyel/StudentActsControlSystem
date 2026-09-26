"use client";

import { Archive, Pencil, Plus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  createNodeAction,
  renameNodeAction,
  reorderAction,
  setNodeArchivedAction,
} from "@/app/ogretmen/curriculum-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NodeKind, SubjectNode, TopicNode } from "@/server/services/curriculum";
import { SortableList } from "./sortable-list";

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
}: {
  kind: NodeKind;
  action: (prev: unknown, formData: FormData) => ReturnType<typeof createNodeAction>;
  defaultValue?: string;
  submitLabel: string;
  onDone?: () => void;
  autoFocus?: boolean;
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
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Name with rename and archive controls. */
function NodeHeader({ kind, id, name, heading }: { kind: NodeKind; id: string; name: string; heading?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <NameForm
        kind={kind}
        action={renameNodeAction.bind(null, kind, id)}
        defaultValue={name}
        submitLabel="Kaydet"
        onDone={() => setEditing(false)}
        autoFocus
      />
    );
  }
  return (
    <div className="flex min-h-11 items-center gap-1">
      <span className={heading ? "min-w-0 flex-1 text-lg font-semibold" : "min-w-0 flex-1"}>{name}</span>
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

function AddChild({ kind, parentId }: { kind: NodeKind; parentId: string }) {
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
    />
  );
}

function TopicBlock({ topic }: { topic: TopicNode }) {
  return (
    <div className="flex flex-col gap-2">
      <NodeHeader kind="topic" id={topic.id} name={topic.name} />
      {topic.stages.length > 0 && (
        <SortableList
          key={topic.stages.map((s) => s.id).join()}
          items={topic.stages}
          onReorder={reorder("stage", topic.id)}
          renderItem={(s) => <NodeHeader kind="stage" id={s.id} name={s.name} />}
        />
      )}
      <AddChild kind="stage" parentId={topic.id} />
    </div>
  );
}

function SubjectBlock({ subject }: { subject: SubjectNode }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <NodeHeader kind="subject" id={subject.id} name={subject.name} heading />
      {subject.topics.length > 0 && (
        <SortableList
          key={subject.topics.map((t) => t.id).join()}
          items={subject.topics}
          onReorder={reorder("topic", subject.id)}
          renderItem={(t) => <TopicBlock topic={t} />}
        />
      )}
      <AddChild kind="topic" parentId={subject.id} />
    </div>
  );
}

export function CurriculumEditor({ classId, subjects }: { classId: string; subjects: SubjectNode[] }) {
  return (
    <div className="flex flex-col gap-4">
      {subjects.length === 0 ? (
        <p className="text-muted-foreground">Henüz ders yok. Önce bir ders ekleyin, sonra konuları ve durakları.</p>
      ) : (
        <SortableList
          key={subjects.map((s) => s.id).join()}
          items={subjects}
          onReorder={reorder("subject", classId)}
          renderItem={(s) => <SubjectBlock subject={s} />}
          className="gap-4"
        />
      )}
      <AddChild kind="subject" parentId={classId} />
    </div>
  );
}
