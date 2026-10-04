import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { parentStudent, schoolClass, student } from "@/server/db/schema";
import { UserError } from "@/server/action-result";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { createClass } from "@/server/services/class";
import { createNode, getNodeClassId, setSubjectGradeLevel } from "@/server/services/curriculum";
import { bulkSetProgress, getClassMatrix, getRoadmapForParent, setProgress } from "@/server/services/progress";
import { addStudents, listStudentsForClass, updateStudent } from "@/server/services/student";
import { createClassSchema } from "@/server/validation/class";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let classId: string;
let first: string; // 1st grader
let second: string; // 2nd grader
let math2Stage: string;
let math2: string;
let shared: string;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  ({ id: classId } = await createClass(db, fx.users.teacherA, {
    name: "Birleştirilmiş",
    gradeLevels: [1, 2, 3],
    academicYear: "2026-2027",
  }));
  [{ id: first }] = (await addStudents(db, fx.users.teacherA, classId, [{ firstName: "Bora", lastInitial: "A" }], 1)) as [{ id: string }];
  [{ id: second }] = (await addStudents(db, fx.users.teacherA, classId, [{ firstName: "Cansu", lastInitial: "B" }], 2)) as [{ id: string }];

  shared = await createNode(db, fx.users.teacherA, "subject", classId, "Hayat Bilgisi");
  math2 = await createNode(db, fx.users.teacherA, "subject", classId, "Matematik 2", null, 2);
  const topic = await createNode(db, fx.users.teacherA, "topic", math2, "Toplama");
  math2Stage = await createNode(db, fx.users.teacherA, "stage", topic, "Onluk bozarak");
});

describe("creating a combined class", () => {
  const base = { name: "X", academicYear: "2026-2027" };

  it("stores the levels sorted and distinct", async () => {
    const [row] = await db.select().from(schoolClass).where(eq(schoolClass.id, classId));
    expect(row!.gradeLevels).toEqual([1, 2, 3]);
    expect(createClassSchema.parse({ ...base, combined: true, gradeLevels: ["3", "1", "3"] }).gradeLevels).toEqual([1, 3]);
    expect(createClassSchema.parse({ ...base, combined: false, gradeLevels: ["2"] }).gradeLevels).toEqual([2]);
  });

  it("needs two levels when combined and exactly one otherwise", () => {
    expect(createClassSchema.safeParse({ ...base, combined: true, gradeLevels: ["2"] }).success).toBe(false);
    expect(createClassSchema.safeParse({ ...base, combined: false, gradeLevels: ["1", "2"] }).success).toBe(false);
    expect(createClassSchema.safeParse({ ...base, combined: true, gradeLevels: ["1", "5"] }).success).toBe(false);
  });
});

describe("students of a combined class", () => {
  it("must get one of the class's levels", async () => {
    const name = [{ firstName: "Deniz", lastInitial: null }];
    await expect(addStudents(db, fx.users.teacherA, classId, name, null)).rejects.toBeInstanceOf(UserError);
    await expect(addStudents(db, fx.users.teacherA, classId, name, 4)).rejects.toBeInstanceOf(UserError);
    await expect(updateStudent(db, fx.users.teacherA, first, { gradeLevel: 4 })).rejects.toBeInstanceOf(UserError);

    const list = await listStudentsForClass(db, classId);
    expect(list.map((s) => [s.firstName, s.gradeLevel])).toEqual([["Bora", 1], ["Cansu", 2]]);
  });

  it("single-level classes fill the level in", async () => {
    const [created] = await addStudents(db, fx.users.teacherA, fx.classes.classA.id, [{ firstName: "Defne", lastInitial: null }], null);
    const [row] = await db.select({ gradeLevel: student.gradeLevel }).from(student).where(eq(student.id, created!.id));
    expect(row!.gradeLevel).toBe(2);
    await db.delete(student).where(eq(student.id, created!.id));
  });
});

describe("grade-specific subjects", () => {
  it("only accept a level the class teaches", async () => {
    await expect(createNode(db, fx.users.teacherA, "subject", classId, "Matematik 4", null, 4)).rejects.toBeInstanceOf(UserError);
    await expect(setSubjectGradeLevel(db, fx.users.teacherA, shared, 4)).rejects.toBeInstanceOf(UserError);
  });

  it("show only that grade's students in the matrix; shared subjects show everyone", async () => {
    expect((await getClassMatrix(db, classId, math2)).students.map((s) => s.firstName)).toEqual(["Cansu"]);
    expect((await getClassMatrix(db, classId, shared)).students.map((s) => s.firstName)).toEqual(["Bora", "Cansu"]);
  });

  it("refuse progress for a student of another grade; 'all' means the subject's grade", async () => {
    await expect(
      setProgress(db, fx.users.teacherA, classId, { studentId: first, stageId: math2Stage, status: "completed" }),
    ).rejects.toMatchObject(FORBIDDEN);
    await expect(
      bulkSetProgress(db, fx.users.teacherA, classId, { stageId: math2Stage, studentIds: [first, second], status: "in_progress" }),
    ).rejects.toMatchObject(FORBIDDEN);
    const { count } = await bulkSetProgress(db, fx.users.teacherA, classId, {
      stageId: math2Stage,
      studentIds: "all",
      status: "in_progress",
    });
    expect(count).toBe(1);
  });

  it("appear on a parent's roadmap only for a child of that grade", async () => {
    await db.insert(parentStudent).values([
      { parentId: fx.users.parentB.id, studentId: first },
      { parentId: fx.users.parentB.id, studentId: second },
    ]);
    const names = async (id: string) => (await getRoadmapForParent(db, fx.users.parentB.id, id)).subjects.map((s) => s.name);
    expect(await names(first)).toEqual(["Hayat Bilgisi"]);
    expect(await names(second)).toEqual(["Hayat Bilgisi", "Matematik 2"]);
  });

  it("another teacher cannot change a subject's grade (guard runs before the service)", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, await getNodeClassId(db, "subject", math2))).rejects.toMatchObject(FORBIDDEN);
  });
});
