import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import { localDay } from "@/server/services/timeline";
import type { BehaviorScope } from "@/server/db/schema";
import { DeleteEventButton } from "./delete-event-button";

type Item = {
  id: string;
  name: string;
  icon: string;
  points: number;
  source: BehaviorScope;
  note: string | null;
  createdAt: Date;
  givenByName: string | null;
};

/** Events grouped by day in the school's time zone. */
export function StudentTimeline({ items, timeZone }: { items: Item[]; timeZone: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">Henüz kayıt yok.</p>;

  const dayTitle = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeZone });
  const time = new Intl.DateTimeFormat("tr-TR", { timeStyle: "short", timeZone });
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = localDay(item.createdAt, timeZone);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.values()].map((group) => (
        <section key={localDay(group[0]!.createdAt, timeZone)} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{dayTitle.format(group[0]!.createdAt)}</h3>
          <ul className="flex flex-col divide-y rounded-xl border">
            {group.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>
                  {e.icon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {e.name}
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        e.points > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                      )}
                    >
                      {formatPoints(e.points)}
                    </span>
                    {e.source === "home" && <Badge variant="secondary">Ev</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {time.format(e.createdAt)}
                    {e.givenByName && ` · ${e.givenByName}`}
                  </span>
                  {e.note && <span className="text-sm">“{e.note}”</span>}
                </div>
                <DeleteEventButton eventId={e.id} label={e.name} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
