"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { createContext, useContext, useId, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string };

type Props<T extends Item> = {
  items: T[];
  /** Persists the new order; returns an error message on failure. */
  onReorder: (ids: string[]) => Promise<string | null>;
  /** Receives the item's current (optimistic) position, starting from 0. */
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  /** Replaces the default row frame (border and background). */
  rowClassName?: string;
};

const screenReaderInstructions = {
  draggable:
    "Taşımak için boşluk tuşuna basın. Yukarı ve aşağı ok tuşlarıyla yer değiştirin, bırakmak için tekrar boşluk, vazgeçmek için Esc tuşuna basın.",
};

function announcements(items: Item[]): Announcements {
  const name = (id: string | number) => items.find((i) => i.id === id)?.name ?? "";
  const position = (id: string | number | undefined) => items.findIndex((i) => i.id === id) + 1;
  return {
    onDragStart: ({ active }) => `${name(active.id)} tutuldu. Sıra ${position(active.id)} / ${items.length}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)}, sıra ${position(over.id)}.` : ""),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} sıra ${position(over.id)} konumuna bırakıldı.` : ""),
    onDragCancel: ({ active }) => `${name(active.id)} taşıma iptal edildi.`,
  };
}

/** Vertical drag-and-drop list; each item renders its own `SortableHandle`. Works with pointer, touch and keyboard. */
export function SortableList<T extends Item>({
  items: initial,
  onReorder,
  renderItem,
  className,
  rowClassName = "rounded-xl border bg-background",
}: Props<T>) {
  // The parent remounts this list (via key) whenever the server order changes.
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // dnd-kit numbers its aria ids with a global counter; a stable id keeps SSR and hydration in sync.
  const dndId = useId();

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = items;
    const next = arrayMove(items, items.findIndex((i) => i.id === active.id), items.findIndex((i) => i.id === over.id));
    setItems(next);
    setError(null);
    start(async () => {
      const failure = await onReorder(next.map((i) => i.id));
      if (failure) {
        setItems(previous);
        setError(failure);
      }
    });
  }

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ screenReaderInstructions, announcements: announcements(items) }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul className={cn("flex flex-col gap-2", className)}>
            {items.map((item, index) => (
              <SortableRow key={item.id} id={item.id} label={item.name} className={rowClassName}>
                {renderItem(item, index)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

function SortableRow({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`${label}: sürükleyerek sırala`}
      className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent active:cursor-grabbing"
    >
      <GripVertical className="size-5" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("py-1 pr-1 xl:pr-2", className, isDragging && "relative z-10 shadow-lg")}
    >
      <HandleContext value={handle}>{children}</HandleContext>
    </li>
  );
}

const HandleContext = createContext<React.ReactNode>(null);

/**
 * The drag handle of the row being rendered. The item places it in its own header line, so nested
 * lists do not lose a handle-wide column per level on narrow screens.
 */
export function SortableHandle() {
  return useContext(HandleContext);
}
