import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { behaviorEvent, student } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { listBehaviorTypes, loadDefaultBehaviorTypes } from "@/server/services/behavior-type";
import { getBatchClassId, getEventClassId, giveBehavior } from "@/server/services/behavior";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let aPlus: string;
let bPlus: string;
let aBatch: string;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
  await loadDefaultBehaviorTypes(db, fx.classes.classB.id);
  aPlus = (await listBehaviorTypes(db, fx.classes.classA.id, { scope: "school" }))[0]!.id;
  bPlus = (await listBehaviorTypes(db, fx.classes.classB.id, { scope: "school" }))[0]!.id;
  aBatch = newUuid();
  await giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, {
    studentIds: [fx.students.studentA1.id],
    behaviorTypeId: aPlus,
    note: null,
    batchId: aBatch,
  });
});

// The scoring actions run: requireRole("teacher") → assertTeacherOfClass(classId) → service.
describe("öğretmen başka sınıfı değiştiremez", () => {
  it("teacher B fails the guard for class A", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
  });

  it("teacher B cannot slip class A students into a class B batch", async () => {
    const before = await db.select().from(student).where(eq(student.id, fx.students.studentA1.id));
    await expect(
      giveBehavior(db, fx.users.teacherB, fx.classes.classB.id, {
        studentIds: [fx.students.studentB1.id, fx.students.studentA1.id],
        behaviorTypeId: bPlus,
        note: null,
        batchId: newUuid(),
      }),
    ).rejects.toMatchObject(FORBIDDEN);
    expect(await db.select().from(student).where(eq(student.id, fx.students.studentA1.id))).toEqual(before);
  });

  it("teacher B cannot reuse class A's batch id through class B", async () => {
    await expect(
      giveBehavior(db, fx.users.teacherB, fx.classes.classB.id, {
        studentIds: [fx.students.studentB1.id],
        behaviorTypeId: bPlus,
        note: null,
        batchId: aBatch,
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("teacher B cannot undo or delete class A's events", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, await getBatchClassId(db, aBatch))).rejects.toMatchObject(
      FORBIDDEN,
    );
    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, aBatch));
    await expect(
      assertTeacherOfClass(fx.users.teacherB, await getEventClassId(db, event!.id)),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("unknown batch and event ids are forbidden, not errors", async () => {
    await expect(getBatchClassId(db, newUuid())).rejects.toMatchObject(FORBIDDEN);
    await expect(getEventClassId(db, newUuid())).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("parents cannot score", () => {
  it("a parent fails the teacher guard even for their own child's class", async () => {
    await expect(assertTeacherOfClass(fx.users.parentA, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
  });
});
