// Shared by client and server: the weekly activity time of a class (PRD §4.12).

export type Activity = { weekday: number; time: string; name: string };

/** Monday first, as the teacher's week reads. */
export const WEEKDAYS = [
  { weekday: 1, label: "Pazartesi" },
  { weekday: 2, label: "Salı" },
  { weekday: 3, label: "Çarşamba" },
  { weekday: 4, label: "Perşembe" },
  { weekday: 5, label: "Cuma" },
  { weekday: 6, label: "Cumartesi" },
  { weekday: 7, label: "Pazar" },
] as const;

/** The alarm still rings when the board is opened shortly after the time. */
export const ALARM_WINDOW_MINUTES = 5;

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Weekday, minute of the day and date in the school's time zone. */
export function schoolClock(timeZone: string, now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: WEEKDAY_INDEX[parts.weekday!]!,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Today's activity if its time came in the last few minutes, else null. */
export function dueActivity(activities: readonly Activity[], clock: ReturnType<typeof schoolClock>) {
  const today = activities.find((a) => a.weekday === clock.weekday);
  if (!today) return null;
  const since = clock.minutes - toMinutes(today.time);
  return since >= 0 && since < ALARM_WINDOW_MINUTES ? today : null;
}
