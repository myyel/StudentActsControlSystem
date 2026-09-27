import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import type { BehaviorScope } from "@/server/db/schema";

type Item = { id: string; name: string; icon: string; points: number; source: BehaviorScope; createdAt: Date };

/** The child's latest school and home events; who gave them and teacher notes are not shown. */
export function RecentEvents({ items, timeZone }: { items: Item[]; timeZone: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">Henüz kayıt yok.</p>;
  const when = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone });

  return (
    <ul className="flex flex-col divide-y">
      {items.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2">
          <span className="text-2xl" aria-hidden>
            {e.icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {e.name}
              <Badge variant={e.source === "home" ? "secondary" : "outline"}>{e.source === "home" ? "Ev" : "Okul"}</Badge>
            </span>
            <span className="text-sm text-muted-foreground">{when.format(e.createdAt)}</span>
          </div>
          <span
            className={cn(
              "font-semibold",
              e.points > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
            )}
          >
            {formatPoints(e.points)}
          </span>
        </li>
      ))}
    </ul>
  );
}
