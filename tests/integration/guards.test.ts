import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { AuthError } from "@/server/auth/errors";
import {
  assertAdminOfSchool,
  assertParentOfStudent,
  assertRole,
  assertTeacherOfClass,
  assertTeacherOfStudent,
} from "@/server/auth/guards";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { name: "AuthError", code: "FORBIDDEN" } satisfies Partial<AuthError>;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

describe("assertRole", () => {
  it("allows a listed role", () => {
    expect(() => assertRole(fx.users.teacherA, "teacher", "admin")).not.toThrow();
  });

  it.each(["teacherA", "parentA"] as const)("rejects %s for an admin-only action", (key) => {
    expect(() => assertRole(fx.users[key], "admin")).toThrow(expect.objectContaining(FORBIDDEN));
  });
});

describe("assertAdminOfSchool", () => {
  it("allows the admin of the school", () => {
    expect(() => assertAdminOfSchool(fx.users.admin1, fx.school1.id)).not.toThrow();
  });

  it("rejects the admin of another school", () => {
    expect(() => assertAdminOfSchool(fx.users.admin2, fx.school1.id)).toThrow(
      expect.objectContaining(FORBIDDEN),
    );
  });

  it("rejects a teacher of the same school", () => {
    expect(() => assertAdminOfSchool(fx.users.teacherA, fx.school1.id)).toThrow(
      expect.objectContaining(FORBIDDEN),
    );
  });
});

describe("assertTeacherOfClass", () => {
  it("allows the teacher of the class", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherA, fx.classes.classA.id)).resolves.toBeUndefined();
  });

  it("rejects a teacher for another class in the same school", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherA, fx.classes.classB.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
  });

  it("rejects an archived class even for its own teacher", async () => {
    await expect(
      assertTeacherOfClass(fx.users.teacherA, fx.classes.classAOld.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects unknown and malformed ids the same way", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherA, UNKNOWN_ID)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.teacherA, "not-a-uuid")).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.teacherA, "1' OR '1'='1")).rejects.toMatchObject(
      FORBIDDEN,
    );
  });

  it.each(["admin1", "parentA"] as const)("rejects %s even with a valid class id", async (key) => {
    await expect(assertTeacherOfClass(fx.users[key], fx.classes.classA.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
  });
});

describe("assertTeacherOfStudent", () => {
  it("allows the teacher of the student's class", async () => {
    await expect(
      assertTeacherOfStudent(fx.users.teacherA, fx.students.studentA1.id),
    ).resolves.toBeUndefined();
  });

  it("rejects a student from another class", async () => {
    await expect(
      assertTeacherOfStudent(fx.users.teacherA, fx.students.studentB1.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects a deleted student", async () => {
    await expect(
      assertTeacherOfStudent(fx.users.teacherA, fx.students.deletedStudent.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects a student of an archived class", async () => {
    await expect(
      assertTeacherOfStudent(fx.users.teacherA, fx.students.studentAOld.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects a parent of the student", async () => {
    await expect(
      assertTeacherOfStudent(fx.users.parentA, fx.students.studentA1.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("assertParentOfStudent", () => {
  it("allows a parent to access each of their children", async () => {
    await expect(assertParentOfStudent(fx.users.parentA, fx.students.studentA1.id)).resolves.toBeUndefined();
    await expect(assertParentOfStudent(fx.users.parentA, fx.students.studentB1.id)).resolves.toBeUndefined();
  });

  it("parent A cannot access student B (a classmate of their child)", async () => {
    await expect(
      assertParentOfStudent(fx.users.parentA, fx.students.studentA2.id),
    ).rejects.toMatchObject(FORBIDDEN);
    await expect(
      assertParentOfStudent(fx.users.parentB, fx.students.studentA1.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects a deleted child", async () => {
    await expect(
      assertParentOfStudent(fx.users.parentA, fx.students.deletedStudent.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects unknown and malformed ids the same way", async () => {
    await expect(assertParentOfStudent(fx.users.parentA, UNKNOWN_ID)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertParentOfStudent(fx.users.parentA, "")).rejects.toMatchObject(FORBIDDEN);
  });

  it("rejects the teacher of the student", async () => {
    await expect(
      assertParentOfStudent(fx.users.teacherA, fx.students.studentA1.id),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});
