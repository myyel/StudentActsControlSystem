import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { getClassActivities, setClassActivities } from "@/server/services/class-activity";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

describe("class activities", () => {
  it("are changed only by a teacher of the class", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherA, fx.classes.classA.id)).resolves.toBeUndefined();
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.parentA, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.admin1, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
  });

  it("start empty, in the school time zone", async () => {
    expect(await getClassActivities(db, fx.classes.classA.id)).toEqual({ timeZone: "Europe/Istanbul", activities: [] });
  });

  it("replace the whole week and write the audit", async () => {
    const A = fx.classes.classA.id;
    await setClassActivities(db, fx.users.teacherA, A, [
      { weekday: 3, time: "10:00", name: "Bahçe oyunu" },
      { weekday: 1, time: "14:30", name: "Kitap okuma saati" },
    ]);
    expect((await getClassActivities(db, A)).activities).toEqual([
      { weekday: 1, time: "14:30", name: "Kitap okuma saati" },
      { weekday: 3, time: "10:00", name: "Bahçe oyunu" },
    ]);

    await setClassActivities(db, fx.users.teacherA, A, [{ weekday: 5, time: "09:15", name: "Masal" }]);
    expect((await getClassActivities(db, A)).activities).toEqual([{ weekday: 5, time: "09:15", name: "Masal" }]);
    // Other classes keep their own week.
    expect((await getClassActivities(db, fx.classes.classB.id)).activities).toEqual([]);

    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "class.activities_update"));
    expect(audits).toHaveLength(2);
    expect(audits.at(-1)).toMatchObject({ entityId: A, actorId: fx.users.teacherA.id });
  });
});
