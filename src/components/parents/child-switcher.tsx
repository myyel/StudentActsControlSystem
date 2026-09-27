import { Plus } from "lucide-react";
import Link from "next/link";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";

type Child = { id: string; firstName: string; lastInitial: string | null };

/** The parent's own children only (the list comes from parent_student). */
export function ChildSwitcher({ items, currentId }: { items: Child[]; currentId: string }) {
  return (
    <nav aria-label="Çocuk seçimi" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.length > 1 &&
        items.map((c) => (
          <Link
            key={c.id}
            href={`/veli/${c.id}`}
            aria-current={c.id === currentId ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full border px-4 font-medium transition-colors",
              c.id === currentId ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {formatStudentName(c)}
          </Link>
        ))}
      <Link
        href="/veli/cocuk-ekle"
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-dashed px-4 text-sm font-medium hover:bg-accent"
      >
        <Plus className="size-4" aria-hidden />
        Çocuk ekle
      </Link>
    </nav>
  );
}
