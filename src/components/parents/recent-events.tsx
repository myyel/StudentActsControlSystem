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
      {items.map((e) => {
        const home = e.source === "home";
        return (
          <li key={e.id} className="flex items-center gap-3 py-2">
            {/* School / home by icon and colour, and in words for screen readers. */}
            <span
              className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-xl", home ? "bg-sun-soft" : "bg-sky-soft")}
              aria-hidden
            >
              {home ? "🏠" : "🏫"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">
                <span aria-hidden>{e.icon} </span>
                {e.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {home ? "Ev" : "Okul"} · {when.format(e.createdAt)}
              </span>
            </div>
            <span className={cn("font-extrabold", e.points > 0 ? "text-grass-strong" : "text-coral-ink")}>
              {formatPoints(e.points)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
