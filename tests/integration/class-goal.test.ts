import { and, eq, isNull } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { auditLog, behaviorEvent, classGoal, type BehaviorScope } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { endClassGoal, getClassGoal, setClassGoal } from "@/server/services/class-goal";
import { classGoalSchema } from "@/server/validation/class";
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

/** The goal only reads events; counters are covered in behavior.test.ts. */
async function addEvent(points: number, opts: { source?: BehaviorScope; deleted?: boolean; at?: Date; classId?: string } = {}) {
  const classId = opts.classId ?? fx.classes.classA.id;
  await db.insert(behaviorEvent).values({
    studentId: classId === fx.classes.classA.id ? fx.students.studentA1.id : fx.students.studentB1.id,
    classId,
    nameSnapshot: points > 0 ? "Yardımlaştı" : "Dersi böldü",
    iconSnapshot: points > 0 ? "🤝" : "🔇",
    pointsSnapshot: points,
    xpDelta: Math.max(points, 0),
    balanceDelta: points,
    source: opts.source ?? "school",
    batchId: newUuid(),
    createdAt: opts.at ?? new Date(),
    deletedAt: opts.deleted ? new Date() : null,
    deleteReason: opts.deleted ? "delete" : null,
  });
}

describe("class goal", () => {
  it("counts positive school points since the goal started; negatives never lower it", async () => {
    await addEvent(5, { at: new Date(Date.now() - 60_000) }); // before the goal
    expect(await getClassGoal(db, fx.classes.classA.id)).toBeNull();

    await setClassGoal(db, fx.users.teacherA, fx.classes.classA.id, { title: "Bahçe oyunu", target: 20 });
    await addEvent(1);
    await addEvent(2);
    await addEvent(-1); // a child's mistake does not set the class back
    await addEvent(3, { source: "home" }); // home points are not the class's
    await addEvent(4, { deleted: true }); // undone or deleted drops out
    await addEvent(6, { classId: fx.classes.classB.id }); // another class

    expect(await getClassGoal(db, fx.classes.classA.id)).toMatchObject({ title: "Bahçe oyunu", target: 20, value: 3 });
  });

  it("a new goal ends the open one and starts from zero; ending is audited", async () => {
    const created = await setClassGoal(db, fx.users.teacherA, fx.classes.classA.id, { title: "Masal saati", target: 10 });
    const open = await db
      .select()
      .from(classGoal)
      .where(and(eq(classGoal.classId, fx.classes.classA.id), isNull(classGoal.endedAt)));
    expect(open.map((g) => g.id)).toEqual([created.id]);
    expect(await getClassGoal(db, fx.classes.classA.id)).toMatchObject({ title: "Masal saati", value: 0 });

    await endClassGoal(db, fx.users.teacherA, fx.classes.classA.id);
    expect(await getClassGoal(db, fx.classes.classA.id)).toBeNull();
    // Nothing open: no second audit row.
    await endClassGoal(db, fx.users.teacherA, fx.classes.classA.id);

    const actions = (await db.select().from(auditLog).where(eq(auditLog.entityId, fx.classes.classA.id))).map((a) => a.action);
    expect(actions.filter((a) => a === "class_goal.set")).toHaveLength(2);
    expect(actions.filter((a) => a === "class_goal.end")).toHaveLength(1);
  });

  it("a teacher cannot set another class's goal (the action runs this guard first)", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.parentA, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
  });

  it("validates title and target", () => {
    expect(classGoalSchema.safeParse({ title: " ", target: 100 }).success).toBe(false);
    expect(classGoalSchema.safeParse({ title: "Oyun", target: 4 }).success).toBe(false);
    expect(classGoalSchema.safeParse({ title: "Oyun", target: "100" }).data).toEqual({ title: "Oyun", target: 100 });
  });
});
