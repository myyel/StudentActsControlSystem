import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { nextStars, nextStatus, progressKey } from "@/lib/progress";
import { db } from "@/server/db";
import { auditLog, student, studentProgress } from "@/server/db/schema";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { createNode, setNodeArchived } from "@/server/services/curriculum";
import { bulkSetProgress, getClassMatrix, setProgress } from "@/server/services/progress";
import { setProgressSchema } from "@/server/validation/progress";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let mathA: string;
let stageA: string;
let stageA2: string;
let stageB: string;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  mathA = await createNode(db, fx.users.teacherA, "subject", fx.classes.classA.id, "Matematik");
  const topicA = await createNode(db, fx.users.teacherA, "topic", mathA, "Toplama");
  stageA = await createNode(db, fx.users.teacherA, "stage", topicA, "Onluk bozmadan");
  stageA2 = await createNode(db, fx.users.teacherA, "stage", topicA, "Onluk bozarak");
  const mathB = await createNode(db, fx.users.teacherB, "subject", fx.classes.classB.id, "Matematik");
  const topicB = await createNode(db, fx.users.teacherB, "topic", mathB, "Sayılar");
  stageB = await createNode(db, fx.users.teacherB, "stage", topicB, "1-100");
});

const A = () => fx.classes.classA.id;

async function cell(studentId: string, stageId: string) {
  const [row] = await db
    .select()
    .from(studentProgress)
    .where(and(eq(studentProgress.studentId, studentId), eq(studentProgress.stageId, stageId)));
  return row ?? null;
}

describe("cycling", () => {
  it("cycles status and stars", () => {
    expect(nextStatus("not_started")).toBe("in_progress");
    expect(nextStatus("in_progress")).toBe("completed");
    expect(nextStatus("completed")).toBe("not_started");
    expect([null, 0, 1, 2, 3].map(nextStars)).toEqual([1, 1, 2, 3, 0]);
  });
});

describe("setProgress", () => {
  it("upserts status, and not_started removes the row", async () => {
    const s = fx.students.studentA1.id;
    await setProgress(db, fx.users.teacherA, A(), { studentId: s, stageId: stageA, status: "in_progress" });
    expect(await cell(s, stageA)).toMatchObject({ status: "in_progress", stars: null });
    await setProgress(db, fx.users.teacherA, A(), { studentId: s, stageId: stageA, status: "completed", stars: 2 });
    expect(await cell(s, stageA)).toMatchObject({ status: "completed", stars: 2, updatedById: fx.users.teacherA.id });
    await setProgress(db, fx.users.teacherA, A(), { studentId: s, stageId: stageA, status: "not_started" });
    expect(await cell(s, stageA)).toBeNull();

    const audit = await db.select().from(auditLog).where(eq(auditLog.entityId, progressKey(s, stageA)));
    expect(audit.map((a) => a.action)).toEqual(["progress.set", "progress.set", "progress.set"]);
  });

  it("drops stars when a stage is no longer completed", async () => {
    const s = fx.students.studentA1.id;
    await setProgress(db, fx.users.teacherA, A(), { studentId: s, stageId: stageA2, status: "completed", stars: 3 });
    await setProgress(db, fx.users.teacherA, A(), { studentId: s, stageId: stageA2, status: "in_progress" });
    expect(await cell(s, stageA2)).toMatchObject({ status: "in_progress", stars: null });
  });

  it("rejects stars on unfinished stages in validation and in the database", async () => {
    const base = { studentId: fx.students.studentA1.id, stageId: stageA };
    expect(setProgressSchema.safeParse({ ...base, status: "in_progress", stars: 1 }).success).toBe(false);
    expect(setProgressSchema.safeParse({ ...base, status: "completed", stars: 4 }).success).toBe(false);
    await expect(
      db.insert(studentProgress).values({ ...base, status: "in_progress", stars: 1 }),
    ).rejects.toThrow();
    await expect(db.insert(studentProgress).values({ ...base, status: "completed", stars: 4 })).rejects.toThrow();
  });

  it("rejects a stage of another class, a student of another class and archived stages", async () => {
    const t = fx.users.teacherA;
    await expect(
      setProgress(db, t, A(), { studentId: fx.students.studentA1.id, stageId: stageB, status: "completed" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      setProgress(db, t, A(), { studentId: fx.students.studentB1.id, stageId: stageA, status: "completed" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      setProgress(db, t, A(), { studentId: fx.students.deletedStudent.id, stageId: stageA, status: "completed" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await setNodeArchived(db, t, "subject", mathA, true);
    await expect(
      setProgress(db, t, A(), { studentId: fx.students.studentA1.id, stageId: stageA, status: "completed" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setNodeArchived(db, t, "subject", mathA, false);
  });
});

describe("bulkSetProgress", () => {
  it("'all' covers only active students of the class and keeps stars of completed cells", async () => {
    const t = fx.users.teacherA;
    await setProgress(db, t, A(), { studentId: fx.students.studentA1.id, stageId: stageA, status: "completed", stars: 3 });
    await db.update(student).set({ active: false }).where(eq(student.id, fx.students.studentA2.id));

    const { count } = await bulkSetProgress(db, t, A(), { stageId: stageA, studentIds: "all", status: "completed" });
    expect(count).toBe(1); // A2 inactive, deleted student excluded
    expect(await cell(fx.students.studentA1.id, stageA)).toMatchObject({ status: "completed", stars: 3 });
    expect(await cell(fx.students.studentA2.id, stageA)).toBeNull();

    await db.update(student).set({ active: true }).where(eq(student.id, fx.students.studentA2.id));
  });

  it("writes nothing when any listed student is outside the class", async () => {
    await expect(
      bulkSetProgress(db, fx.users.teacherA, A(), {
        stageId: stageA2,
        studentIds: [fx.students.studentA2.id, fx.students.studentB1.id],
        status: "in_progress",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await cell(fx.students.studentA2.id, stageA2)).toBeNull();
  });

  it("not_started clears the column for the given students", async () => {
    const t = fx.users.teacherA;
    await bulkSetProgress(db, t, A(), { stageId: stageA, studentIds: "all", status: "not_started" });
    expect(await cell(fx.students.studentA1.id, stageA)).toBeNull();
    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "progress.bulk_set"));
    expect(audit).toHaveLength(2);
  });
});

describe("getClassMatrix", () => {
  it("returns the subject's live stages, active students and their progress", async () => {
    await setProgress(db, fx.users.teacherA, A(), { studentId: fx.students.studentA2.id, stageId: stageA2, status: "in_progress" });
    const matrix = await getClassMatrix(db, A(), mathA);
    expect(matrix.subject.topics[0]!.stages.map((s) => s.id)).toEqual([stageA, stageA2]);
    expect(matrix.students.map((s) => s.firstName)).toEqual(["Ada", "Ali"]);
    expect(matrix.progress[progressKey(fx.students.studentA2.id, stageA2)]).toEqual({ status: "in_progress", stars: null });
  });

  it("rejects a subject of another class", async () => {
    const turkishB = await createNode(db, fx.users.teacherB, "subject", fx.classes.classB.id, "Türkçe");
    const bMatrix = await getClassMatrix(db, fx.classes.classB.id, turkishB);
    expect(bMatrix.students.map((s) => s.firstName)).toEqual(["Can"]);
    await expect(getClassMatrix(db, A(), turkishB)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("öğretmen başka sınıfı değiştiremez", () => {
  it("teacher B fails the class guard that every progress action runs first", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, A())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("teacher B cannot change class A progress through class B", async () => {
    await expect(
      setProgress(db, fx.users.teacherB, fx.classes.classB.id, {
        studentId: fx.students.studentA1.id,
        stageId: stageA,
        status: "completed",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      bulkSetProgress(db, fx.users.teacherB, fx.classes.classB.id, { stageId: stageA, studentIds: "all", status: "completed" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
