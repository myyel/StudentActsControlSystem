import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_LEVEL_THRESHOLDS } from "@/lib/character";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { auditLog, behaviorEvent, characterStage, characterType, student } from "@/server/db/schema";
import { UserError } from "@/server/action-result";
import { assertAdminOfCharacterType, assertParentOfStudent, assertTeacherOfStudent } from "@/server/auth/guards";
import { listBehaviorTypes, loadDefaultBehaviorTypes } from "@/server/services/behavior-type";
import { deleteEvent, giveBehavior, undoBatch } from "@/server/services/behavior";
import {
  getLevelThresholds,
  getStudentCharacter,
  listBoardStudents,
  listCharacterTypes,
  setStudentCharacterType,
  updateCharacterType,
  updateLevelThresholds,
} from "@/server/services/character";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
const STAGE_NAMES = ["Yumurta", "Yavru", "Genç", "Güçlü", "Bilge"];

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let types: { plus1: string; plus2: string; minus1: string };
let dragonId: string;
let owlId: string; // school 1
let robotId: string; // school 2

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
  const list = await listBehaviorTypes(db, fx.classes.classA.id);
  const find = (name: string) => list.find((t) => t.name === name)!.id;
  types = { plus1: find("Yardımlaştı"), plus2: find("Harika iş"), minus1: find("Dersi böldü") };

  dragonId = fx.students.studentA1.characterTypeId;
  await db.insert(characterStage).values(
    STAGE_NAMES.map((name, i) => ({ characterTypeId: dragonId, level: i + 1, name, assetUrl: `/characters/ejderha/${i + 1}.svg` })),
  );
  const [owl, robot] = await db
    .insert(characterType)
    .values([
      { name: "Baykuş", schoolId: fx.school1.id, sortOrder: 2 },
      { name: "Robot", schoolId: fx.school2.id, sortOrder: 3 },
    ])
    .returning();
  owlId = owl!.id;
  robotId = robot!.id;
});

const A1 = () => fx.students.studentA1.id;
const A2 = () => fx.students.studentA2.id;

const give = (studentIds: string[], behaviorTypeId: string, batchId = newUuid()) =>
  giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, { studentIds, behaviorTypeId, note: null, batchId });

const setXp = (studentId: string, xp: number) => db.update(student).set({ xp }).where(eq(student.id, studentId));

async function state(studentId: string) {
  const [row] = await db
    .select({ xp: student.xp, level: student.characterLevel, typeId: student.characterTypeId })
    .from(student)
    .where(eq(student.id, studentId));
  return row!;
}

describe("level ups while scoring", () => {
  let firstBatch: string;

  it("raises the level in the scoring transaction and reports the stages", async () => {
    await setXp(A1(), 19);
    const result = await give([A1(), A2()], types.plus1);
    firstBatch = result.batchId;

    expect(result.levelUps).toEqual([
      {
        studentId: A1(),
        fromLevel: 1,
        toLevel: 2,
        from: { name: "Yumurta", assetUrl: "/characters/ejderha/1.svg" },
        to: { name: "Yavru", assetUrl: "/characters/ejderha/2.svg" },
      },
    ]);
    expect(await state(A1())).toMatchObject({ xp: 20, level: 2 });
    expect(await state(A2())).toMatchObject({ xp: 1, level: 1 });

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.entityId, firstBatch));
    expect(audit!.data).toMatchObject({ levelUps: [{ studentId: A1(), fromLevel: 1, toLevel: 2 }] });
  });

  it("can skip several levels at once", async () => {
    await setXp(A2(), 99);
    const result = await give([A2()], types.plus2);
    expect(result.levelUps.map((u) => [u.fromLevel, u.toLevel])).toEqual([[1, 4]]);
    expect(await state(A2())).toMatchObject({ xp: 101, level: 4 });
  });

  it("does not level up on negative points or a retried batch", async () => {
    expect((await give([A1()], types.minus1)).levelUps).toEqual([]);

    await setXp(A1(), 49);
    const batchId = newUuid();
    expect((await give([A1()], types.plus1, batchId)).levelUps).toHaveLength(1);
    const retry = await give([A1()], types.plus1, batchId);
    expect(retry).toMatchObject({ duplicate: true, levelUps: [] });
    expect(await state(A1())).toMatchObject({ xp: 50, level: 3 });
  });

  it("undo and delete take the XP back but never lower the level", async () => {
    const result = await give([A1()], types.plus2);
    expect(await state(A1())).toMatchObject({ xp: 52, level: 3 });
    await undoBatch(db, fx.users.teacherA, result.batchId);
    expect(await state(A1())).toMatchObject({ xp: 50, level: 3 });

    const [event] = await db
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.studentId, A1()), eq(behaviorEvent.batchId, firstBatch)));
    await deleteEvent(db, fx.users.teacherA, event!.id);
    expect(await state(A1())).toMatchObject({ xp: 49, level: 3 });
  });
});

describe("level thresholds", () => {
  it("uses the defaults until the school sets its own", async () => {
    expect(await getLevelThresholds(db, fx.school1.id)).toEqual([...DEFAULT_LEVEL_THRESHOLDS]);
  });

  it("raises students who now qualify, writes the audit and is used for scoring", async () => {
    await setXp(A1(), 12);
    const { raised } = await updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 5, 10, 15, 1000]);
    expect(raised).toBe(0); // A1 is already level 3 (≥ 10 XP), A2 level 4 (101 XP ≥ 15)

    await setXp(A2(), 1);
    await db.update(student).set({ characterLevel: 1 }).where(eq(student.id, A2()));
    const second = await updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 1, 10, 15, 1000]);
    expect(second.raised).toBe(1);
    expect(await state(A2())).toMatchObject({ level: 2 });

    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "character.thresholds_update"));
    expect(audits.at(-1)!.data).toMatchObject({ from: [0, 5, 10, 15, 1000], to: [0, 1, 10, 15, 1000], raisedStudents: 1 });

    const result = await give([A1()], types.plus2); // 12 → 14 XP: still level 3
    expect(result.levelUps).toEqual([]);
    await setXp(A1(), 14);
    expect((await give([A1()], types.plus1)).levelUps.map((u) => u.toLevel)).toEqual([4]);
  });

  it("never lowers anyone when thresholds go up", async () => {
    await updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 500, 600, 700, 800]);
    expect(await state(A1())).toMatchObject({ level: 4 });
    expect(await state(A2())).toMatchObject({ level: 2 });
  });
});

describe("character types", () => {
  it("lists the school's own and the global types, not other schools'", async () => {
    const list = await listCharacterTypes(db, fx.school1.id);
    expect(list.map((t) => [t.name, t.editable])).toEqual([
      ["Ejderha", false],
      ["Baykuş", true],
    ]);
    expect(list[0]!.stages.map((s) => s.name)).toEqual(STAGE_NAMES);
    // No stages yet: placeholders.
    expect(list[1]!.stages[0]).toEqual({ name: "1. seviye", assetUrl: "/characters/placeholder.svg" });
  });

  it("lets only the admin of the owning school edit a type", async () => {
    await expect(assertAdminOfCharacterType(fx.users.admin1, owlId)).resolves.toBeUndefined();
    await expect(assertAdminOfCharacterType(fx.users.admin2, owlId)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertAdminOfCharacterType(fx.users.admin1, robotId)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertAdminOfCharacterType(fx.users.admin1, dragonId)).rejects.toMatchObject(FORBIDDEN); // global
    await expect(assertAdminOfCharacterType(fx.users.teacherA, owlId)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertAdminOfCharacterType(fx.users.admin1, "not-a-uuid")).rejects.toMatchObject(FORBIDDEN);
  });

  it("renames the type and its stages", async () => {
    const stageNames = ["Yumurta", "Tüylü", "Küçük", "Dalda", "Bilge"];
    await updateCharacterType(db, fx.users.admin1, owlId, { name: "Bilge Baykuş", active: true, stageNames });
    const owl = (await listCharacterTypes(db, fx.school1.id)).find((t) => t.id === owlId)!;
    expect(owl.name).toBe("Bilge Baykuş");
    expect(owl.stages.map((s) => s.name)).toEqual(stageNames);

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.action, "character_type.update"));
    expect(audit).toMatchObject({ entityId: owlId, actorId: fx.users.admin1.id });
  });

  it("keeps at least one active type for new students", async () => {
    await db.update(characterType).set({ active: false }).where(eq(characterType.id, dragonId));
    const input = { name: "Bilge Baykuş", active: false, stageNames: STAGE_NAMES };
    await expect(updateCharacterType(db, fx.users.admin1, owlId, input)).rejects.toBeInstanceOf(UserError);
    await db.update(characterType).set({ active: true }).where(eq(characterType.id, dragonId));
  });
});

describe("student character type", () => {
  it("is changed only by a teacher of the student's class", async () => {
    await expect(assertTeacherOfStudent(fx.users.teacherA, A1())).resolves.toBeUndefined();
    await expect(assertTeacherOfStudent(fx.users.teacherA, fx.students.studentB1.id)).rejects.toMatchObject(FORBIDDEN);
    // Parents see their child but cannot pass the teacher guard.
    await expect(assertParentOfStudent(fx.users.parentA, A1())).resolves.toBeUndefined();
    await expect(assertTeacherOfStudent(fx.users.parentA, A1())).rejects.toMatchObject(FORBIDDEN);
  });

  it("changes the type, keeps the level and writes the audit", async () => {
    const before = await state(A1());
    await setStudentCharacterType(db, fx.users.teacherA, A1(), owlId);
    expect(await state(A1())).toEqual({ ...before, typeId: owlId });

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.action, "student.character_change"));
    expect(audit).toMatchObject({ entityId: A1(), data: { from: dragonId, to: owlId } });

    const character = await getStudentCharacter(db, A1());
    expect(character).toMatchObject({ characterTypeId: owlId, level: before.level, stage: { name: "Dalda" } });
  });

  it("rejects another school's type and inactive types", async () => {
    await expect(setStudentCharacterType(db, fx.users.teacherA, A2(), robotId)).rejects.toMatchObject(FORBIDDEN);

    await db.update(characterType).set({ active: false }).where(eq(characterType.id, owlId));
    await expect(setStudentCharacterType(db, fx.users.teacherA, A2(), owlId)).rejects.toBeInstanceOf(UserError);
    await db.update(characterType).set({ active: true }).where(eq(characterType.id, owlId));
  });
});

describe("board students", () => {
  it("sends only name, type, level, stages and progress; active students sorted by name", async () => {
    await db.insert(student).values({ classId: fx.classes.classA.id, firstName: "Zeynep", gradeLevel: 2, characterTypeId: dragonId, active: false });
    const board = await listBoardStudents(db, fx.classes.classA.id);

    expect(board.map((s) => s.firstName)).toEqual(["Ada", "Ali"]);
    for (const s of board) {
      expect(Object.keys(s).sort()).toEqual(["characterTypeId", "firstName", "id", "lastInitial", "level", "nextStageName", "progress", "stage"]);
      expect(s.progress).toBeGreaterThanOrEqual(0);
      expect(s.progress).toBeLessThanOrEqual(1);
    }
  });
});
