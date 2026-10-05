import { describe, expect, it } from "vitest";
import { dueActivity, schoolClock } from "@/lib/activity";
import { classActivitiesSchema } from "@/server/validation/class";

const IST = "Europe/Istanbul"; // UTC+3, no DST

describe("schoolClock", () => {
  it("reads weekday, minutes and date in the school time zone", () => {
    // Monday 2026-10-05 22:30 UTC is Tuesday 01:30 in Istanbul.
    expect(schoolClock(IST, new Date("2026-10-05T22:30:00Z"))).toEqual({ weekday: 2, minutes: 90, date: "2026-10-06" });
    expect(schoolClock(IST, new Date("2026-10-11T09:00:00Z"))).toMatchObject({ weekday: 7, minutes: 12 * 60 });
  });
});

describe("dueActivity", () => {
  const week = [
    { weekday: 2, time: "14:30", name: "Kitap okuma saati" },
    { weekday: 3, time: "10:00", name: "Bahçe oyunu" },
  ];
  const at = (iso: string) => dueActivity(week, schoolClock(IST, new Date(iso)));

  it("rings from the time for a few minutes on that weekday only", () => {
    expect(at("2026-10-06T11:29:00Z")).toBeNull(); // Tue 14:29
    expect(at("2026-10-06T11:30:00Z")?.name).toBe("Kitap okuma saati");
    expect(at("2026-10-06T11:34:59Z")?.name).toBe("Kitap okuma saati");
    expect(at("2026-10-06T11:35:00Z")).toBeNull();
    expect(at("2026-10-05T11:30:00Z")).toBeNull(); // Monday
  });
});

describe("classActivitiesSchema", () => {
  it("accepts one activity per weekday with a valid time", () => {
    const ok = classActivitiesSchema.safeParse({ activities: [{ weekday: "1", time: "09:05", name: " Masal " }] });
    expect(ok.success && ok.data.activities[0]).toEqual({ weekday: 1, time: "09:05", name: "Masal" });
  });

  it("rejects bad times, empty names and two activities on one day", () => {
    const bad = (activities: unknown[]) => classActivitiesSchema.safeParse({ activities }).success;
    expect(bad([{ weekday: 1, time: "24:00", name: "A" }])).toBe(false);
    expect(bad([{ weekday: 1, time: "9:00", name: "A" }])).toBe(false);
    expect(bad([{ weekday: 1, time: "09:00", name: "  " }])).toBe(false);
    expect(bad([{ weekday: 8, time: "09:00", name: "A" }])).toBe(false);
    expect(
      bad([
        { weekday: 1, time: "09:00", name: "A" },
        { weekday: 1, time: "10:00", name: "B" },
      ]),
    ).toBe(false);
  });
});
