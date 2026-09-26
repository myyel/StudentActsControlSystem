import type { DaySummary } from "@/server/services/timeline";

const weekday = (day: string) =>
  new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/** Positive (green) and negative (red) points per day. Plain HTML so it needs no chart library. */
export function WeekChart({ days }: { days: DaySummary[] }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.positive, d.negative]));
  const height = (value: number) => `${(value / max) * 100}%`;
  const totalPositive = days.reduce((s, d) => s + d.positive, 0);
  const totalNegative = days.reduce((s, d) => s + d.negative, 0);

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex h-40 items-end gap-2" aria-hidden>
        {days.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div className="flex h-full w-1/2 max-w-6 flex-col justify-end">
                {d.positive > 0 && <span className="text-center text-xs">{d.positive}</span>}
                <div className="rounded-t bg-emerald-500" style={{ height: height(d.positive) }} />
              </div>
              <div className="flex h-full w-1/2 max-w-6 flex-col justify-end">
                {d.negative > 0 && <span className="text-center text-xs">{d.negative}</span>}
                <div className="rounded-t bg-red-500" style={{ height: height(d.negative) }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{weekday(d.day)}</span>
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded-sm bg-emerald-500" aria-hidden /> Olumlu: +{totalPositive}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded-sm bg-red-500" aria-hidden /> Olumsuz: −{totalNegative}
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Son 7 gün, gün gün olumlu ve olumsuz puanlar</caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            <th scope="col">Olumlu</th>
            <th scope="col">Olumsuz</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.positive}</td>
              <td>{d.negative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
