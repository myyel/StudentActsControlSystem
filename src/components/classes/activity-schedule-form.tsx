"use client";

import { useState, useTransition } from "react";
import { setClassActivitiesAction } from "@/app/ogretmen/activity-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS, type Activity } from "@/lib/activity";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";

type Row = { on: boolean; time: string; name: string };

/** One activity time per weekday; a day that is off has no alarm. */
export function ActivityScheduleForm({ classId, activities }: { classId: string; activities: Activity[] }) {
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      WEEKDAYS.map(({ weekday }) => {
        const a = activities.find((x) => x.weekday === weekday);
        return [weekday, a ? { on: true, time: a.time, name: a.name } : { on: false, time: "", name: "" }];
      }),
    ),
  );
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);

  const update = (weekday: number, patch: Partial<Row>) => {
    setState(null);
    setRows((prev) => ({ ...prev, [weekday]: { ...prev[weekday]!, ...patch } }));
  };

  const monday = rows[1]!;
  function copyMonday() {
    setState(null);
    setRows((prev) => {
      const next = { ...prev };
      for (const weekday of [2, 3, 4, 5]) next[weekday] = { ...monday };
      return next;
    });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const list = WEEKDAYS.filter(({ weekday }) => rows[weekday]!.on).map(({ weekday }) => ({
      weekday,
      time: rows[weekday]!.time,
      name: rows[weekday]!.name,
    }));
    start(async () => setState(await setClassActivitiesAction(classId, list)));
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {WEEKDAYS.map(({ weekday, label }) => {
          const row = rows[weekday]!;
          const id = (s: string) => `activity-${weekday}-${s}`;
          return (
            <li
              key={weekday}
              className={cn(
                "grid gap-3 rounded-xl border p-3 sm:grid-cols-[10rem_8rem_1fr] sm:items-end",
                row.on ? "border-primary/40 bg-primary/5" : "bg-card",
              )}
            >
              <label className="flex min-h-11 items-center gap-3 font-semibold">
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(e) => update(weekday, { on: e.target.checked })}
                  className="size-5 shrink-0"
                />
                {label}
              </label>
              {row.on ? (
                <>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={id("time")}>Saat</Label>
                    <Input
                      id={id("time")}
                      type="time"
                      required
                      value={row.time}
                      onChange={(e) => update(weekday, { time: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={id("name")}>Etkinlik</Label>
                    <Input
                      id={id("name")}
                      required
                      maxLength={60}
                      placeholder="ör. Kitap okuma saati"
                      value={row.name}
                      onChange={(e) => update(weekday, { name: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2 sm:self-center">Etkinlik yok</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        Saat geldiğinde tahta modu açıksa zil çalar ve etkinliğin adı tam ekran görünür. Saatler okulun saat dilimine
        göredir. Tarayıcılar sesi yalnızca tahtaya bir kez dokunulduktan sonra çalar.
      </p>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Kaydet
        </Button>
        <Button type="button" variant="outline" disabled={pending || !monday.on} onClick={copyMonday}>
          Pazartesiyi hafta içine kopyala
        </Button>
      </div>
    </form>
  );
}
