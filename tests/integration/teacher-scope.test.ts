import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { auditLog, classTeacher, parentStudent, student } from "@/server/db/schema";
import { assertTeacherOfClass, assertTeacherOfStudent } from "@/server/auth/guards";
import { createClass, listClassesForTeacher } from "@/server/services/class";
import { addStudents, listStudentsForClass, updateStudent } from "@/server/services/student";
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

describe("class creation", () => {
  it("creates the class in the teacher's school and assigns the teacher", async () => {
    const created = await createClass(db, fx.users.teacherA, {
      name: "3-C",
      gradeLevels: [3],
      academicYear: "2026-2027",
    });
    expect(created.schoolId).toBe(fx.school1.id);

    const links = await db.select().from(classTeacher).where(eq(classTeacher.classId, created.id));
    expect(links.map((l) => l.userId)).toEqual([fx.users.teacherA.id]);
    await expect(assertTeacherOfClass(fx.users.teacherA, created.id)).resolves.toBeUndefined();
    await expect(assertTeacherOfClass(fx.users.teacherB, created.id)).rejects.toMatchObject(FORBIDDEN);

    const audit = await db.select().from(auditLog).where(eq(auditLog.entityId, created.id));
    expect(audit.map((a) => a.action)).toEqual(["class.create"]);
  });

  it("rejects parents, admins and teachers without a school", async () => {
    const input = { name: "X", gradeLevels: [1], academicYear: "2026-2027" };
    await expect(createClass(db, fx.users.parentA, input)).rejects.toMatchObject(FORBIDDEN);
    await expect(createClass(db, fx.users.admin1, input)).rejects.toMatchObject(FORBIDDEN);
    await expect(
      createClass(db, { ...fx.users.teacherA, schoolId: null }, input),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("class listing", () => {
  it("lists only the teacher's own non-archived classes", async () => {
    const aClasses = await listClassesForTeacher(db, fx.users.teacherA.id);
    const ids = aClasses.map((c) => c.id);
    expect(ids).toContain(fx.classes.classA.id);
    expect(ids).not.toContain(fx.classes.classB.id);
    expect(ids).not.toContain(fx.classes.classAOld.id);
  });

  it("counts students with a linked parent once, ignoring deleted students", async () => {
    // A second parent for studentA1 must not count the student (or the class size) twice.
    await db.insert(parentStudent).values({ parentId: fx.users.parentB.id, studentId: fx.students.studentA1.id });
    try {
      const classA = (await listClassesForTeacher(db, fx.users.teacherA.id)).find((c) => c.id === fx.classes.classA.id);
      expect(classA).toMatchObject({ studentCount: 2, withParentCount: 2 });
    } finally {
      await db
        .delete(parentStudent)
        .where(and(eq(parentStudent.parentId, fx.users.parentB.id), eq(parentStudent.studentId, fx.students.studentA1.id)));
    }
  });
});

describe("student management", () => {
  it("adds students with the default character type and excludes deleted ones from the list", async () => {
    const created = await addStudents(db, fx.users.teacherB, fx.classes.classB.id, [
      { firstName: "Deniz", lastInitial: "K" },
      { firstName: "Ece", lastInitial: null },
    ], null);
    expect(created).toHaveLength(2);

    const list = await listStudentsForClass(db, fx.classes.classB.id);
    expect(list.map((s) => s.firstName)).toEqual(["Can", "Deniz", "Ece"]);

    const classAList = await listStudentsForClass(db, fx.classes.classA.id);
    expect(classAList.map((s) => s.firstName)).not.toContain("Ece");
  });

  it("teacher B cannot pass the guards for teacher A's class or students", async () => {
    // Actions call these guards before addStudents/updateStudent.
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(
      assertTeacherOfStudent(fx.users.teacherB, fx.students.studentA1.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("updates name and active flag with an audit entry", async () => {
    await updateStudent(db, fx.users.teacherA, fx.students.studentA2.id, { firstName: "Alim", active: false });
    const [row] = await db.select().from(student).where(eq(student.id, fx.students.studentA2.id));
    expect(row).toMatchObject({ firstName: "Alim", active: false });

    const audit = await db.select().from(auditLog).where(eq(auditLog.entityId, fx.students.studentA2.id));
    expect(audit[0]).toMatchObject({ action: "student.update", actorId: fx.users.teacherA.id });
  });
});
