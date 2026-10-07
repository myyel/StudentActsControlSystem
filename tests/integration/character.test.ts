import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_LEVEL_THRESHOLDS } from "@/lib/character";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import {
  auditLog,
  behaviorEvent,
  characterStage,
  characterType,
  notification,
  student,
  studentCharacterCompletion,
} from "@/server/db/schema";
import { UserError } from "@/server/action-result";
import {
  assertAdminOfCharacterType,
  assertParentOfStudent,
  assertTeacherOfClass,
  assertTeacherOfStudent,
} from "@/server/auth/guards";
import { listBehaviorTypes, loadDefaultBehaviorTypes } from "@/server/services/behavior-type";
import { deleteEvent, giveBehavior, undoBatch } from "@/server/services/behavior";
import {
  getClassCharacterTypes,
  getClassLevelSettings,
  getLevelThresholds,
  getStudentCharacter,
  listBoardStudents,
  listCharacterTypes,
  listClassCharacterTypes,
  listCompletedCharacters,
  updateCharacterType,
  updateClassCharacterTypes,
  updateClassLevels,
  updateClassStageNames,
  updateLevelThresholds,
  withStages,
} from "@/server/services/character";
import { addStudents } from "@/server/services/student";
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

});

describe("finishing a character", () => {
  // Class A offers dragon then owl; defaults: levels 0/20/50/100/200, a character is finished at 300.
  const base = async (studentId: string) =>
    (await db.select({ base: student.characterXpBase }).from(student).where(eq(student.id, studentId)))[0]!.base;
  const reset = (studentId: string, xp: number, level: number) =>
    db
      .update(student)
      .set({ xp, characterLevel: level, characterTypeId: dragonId, characterXpBase: 0 })
      .where(eq(student.id, studentId));

  // The tests above leave the school on high thresholds; the ones below expect them back.
  beforeAll(() => updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [...DEFAULT_LEVEL_THRESHOLDS]));
  afterAll(() => updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 500, 600, 700, 800]));

  it("stays on the last level until the completion XP, filling the ring towards the next character", async () => {
    await reset(A1(), 199, 4);
    const result = await give([A1()], types.plus1);
    expect(result.levelUps.map((u) => [u.fromLevel, u.toLevel, u.newCharacter])).toEqual([[4, 5, undefined]]);
    expect(await state(A1())).toMatchObject({ xp: 200, level: 5, typeId: dragonId });

    const character = await getStudentCharacter(db, A1());
    expect(character).toMatchObject({ level: 5, xp: 200, nextThreshold: 300, progress: 0, completed: [] });
    expect(character.nextCharacter).toMatchObject({ name: "Bilge Baykuş" });
  });

  it("moves to the first stage of the next character in the class's order", async () => {
    await reset(A1(), 299, 5);
    const result = await give([A1()], types.plus1);

    expect(result.levelUps).toEqual([
      {
        studentId: A1(),
        fromLevel: 5,
        toLevel: 1,
        newCharacter: true,
        from: { name: "Bilge", assetUrl: "/characters/ejderha/5.svg" },
        to: expect.objectContaining({ name: expect.any(String) }),
      },
    ]);
    expect(await state(A1())).toMatchObject({ xp: 300, level: 1, typeId: owlId });
    expect(await base(A1())).toBe(300);

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.entityId, result.batchId));
    expect(audit!.data).toMatchObject({ levelUps: [{ studentId: A1(), fromLevel: 5, toLevel: 1, newCharacter: true }] });

    const completed = await listCompletedCharacters(db, A1(), fx.classes.classA.id);
    expect(completed.map((c) => [c.typeName, c.stage.name])).toEqual([["Ejderha", "Bilge"]]);

    // The parent hears about it.
    const notes = await db.select().from(notification).where(eq(notification.userId, fx.users.parentA.id));
    expect(notes.map((n) => n.payload)).toContainEqual(
      expect.objectContaining({ studentId: A1(), title: expect.stringContaining("karakterini tamamladı") }),
    );

    // The new character counts its own XP from zero.
    const character = await getStudentCharacter(db, A1());
    expect(character).toMatchObject({ characterTypeId: owlId, level: 1, xp: 0, nextThreshold: 20, progress: 0 });
    expect(character.nextCharacter).toMatchObject({ name: "Ejderha" });
  });

  it("levels the new character up from its own XP", async () => {
    await setXp(A1(), 319);
    const result = await give([A1()], types.plus1);
    expect(result.levelUps.map((u) => [u.fromLevel, u.toLevel, u.newCharacter])).toEqual([[1, 2, undefined]]);
    expect(await state(A1())).toMatchObject({ xp: 320, level: 2, typeId: owlId });
  });

  it("never goes back when events are undone or deleted", async () => {
    await reset(A2(), 299, 5);
    const result = await give([A2()], types.plus2);
    expect(await state(A2())).toMatchObject({ xp: 301, level: 1, typeId: owlId });

    await undoBatch(db, fx.users.teacherA, result.batchId);
    expect(await state(A2())).toMatchObject({ xp: 299, level: 1, typeId: owlId });
    expect(await listCompletedCharacters(db, A2(), fx.classes.classA.id)).toHaveLength(1);
    // Below the character's start: no progress, and no second completion on the way back up.
    expect((await getStudentCharacter(db, A2())).progress).toBe(0);
    expect((await give([A2()], types.plus1)).levelUps).toEqual([]);
    expect(await listCompletedCharacters(db, A2(), fx.classes.classA.id)).toHaveLength(1);
  });

  it("starts the order again after the last character", async () => {
    // A1 is on the owl, the last of dragon → owl.
    await db.update(student).set({ xp: 599, characterLevel: 5 }).where(eq(student.id, A1()));
    const result = await give([A1()], types.plus1);
    expect(result.levelUps.at(-1)).toMatchObject({ newCharacter: true, toLevel: 1 });
    expect(await state(A1())).toMatchObject({ xp: 600, level: 1, typeId: dragonId });
    expect(await base(A1())).toBe(600);
    expect((await listCompletedCharacters(db, A1(), fx.classes.classA.id)).map((c) => c.typeName)).toEqual(["Ejderha", "Bilge Baykuş"]);
  });

  it("reaches the last level and finishes in one score when the XP jumps past both", async () => {
    await db.delete(studentCharacterCompletion).where(eq(studentCharacterCompletion.studentId, A2()));
    await reset(A2(), 299, 1);
    const result = await give([A2()], types.plus1);
    expect(result.levelUps.map((u) => [u.fromLevel, u.toLevel, u.newCharacter])).toEqual([
      [1, 5, undefined],
      [5, 1, true],
    ]);
  });

  it("uses the teacher's completion XP and waits for the next positive score after a change", async () => {
    await db.delete(studentCharacterCompletion).where(eq(studentCharacterCompletion.studentId, A2()));
    await reset(A2(), 150, 4);
    // Three levels, finished at 120: the student is already past it, but nothing moves silently.
    await updateClassLevels(db, fx.users.teacherA, fx.classes.classA.id, [0, 20, 50], null, 120);
    expect(await getClassLevelSettings(db, fx.classes.classA.id)).toMatchObject({ thresholds: [0, 20, 50], completeXp: 120 });
    expect(await state(A2())).toMatchObject({ level: 4, typeId: dragonId });

    const result = await give([A2()], types.plus1);
    expect(result.levelUps).toMatchObject([{ newCharacter: true, fromLevel: 4, toLevel: 1 }, { fromLevel: 1, toLevel: 2 }]);
    expect(await state(A2())).toMatchObject({ xp: 151, level: 2, typeId: owlId });
    expect(await base(A2())).toBe(120);

    // A completion XP at or below the last level is ignored in favour of the default.
    await updateClassLevels(db, fx.users.teacherA, fx.classes.classA.id, [0, 20, 50], null, 50);
    expect((await getClassLevelSettings(db, fx.classes.classA.id)).completeXp).toBe(80);
    await updateClassLevels(db, fx.users.teacherA, fx.classes.classA.id, null);
    expect(await getClassLevelSettings(db, fx.classes.classA.id)).toMatchObject({ custom: false, completeXp: 300 });
  });

  it("restarts the same character in a class with a single type", async () => {
    await updateClassCharacterTypes(db, fx.users.teacherA, fx.classes.classA.id, [dragonId]);
    await reset(A1(), 299, 5);
    await give([A1()], types.plus1);
    expect(await state(A1())).toMatchObject({ level: 1, typeId: dragonId });
    await updateClassCharacterTypes(db, fx.users.teacherA, fx.classes.classA.id, null);
  });
});

describe("board students", () => {
  it("sends only name, type, level, stages and progress; active students sorted by name", async () => {
    await db.insert(student).values({ classId: fx.classes.classA.id, firstName: "Zeynep", gradeLevel: 2, characterTypeId: dragonId, active: false });
    const board = await listBoardStudents(db, fx.classes.classA.id);

    expect(board.map((s) => s.firstName)).toEqual(["Ada", "Ali"]);
    for (const s of board) {
      expect(Object.keys(s).sort()).toEqual(["characterTypeId", "firstName", "id", "lastInitial", "level", "maxLevel", "nextStageName", "progress", "stage"]);
      expect(s.progress).toBeGreaterThanOrEqual(0);
      expect(s.progress).toBeLessThanOrEqual(1);
    }
  });
});

describe("class character settings", () => {
  // Class B (teacher B) gets its own students so earlier tests do not leak in.
  const B = () => fx.classes.classB.id;
  let low: string; // 4 XP, level 1
  let top: string; // reached level 5 earlier, 0 XP now
  let behaviorId: string;

  beforeAll(async () => {
    const rows = await db
      .insert(student)
      .values([
        { classId: B(), firstName: "Deniz", gradeLevel: 2, characterTypeId: dragonId, xp: 4 },
        { classId: B(), firstName: "Elif", gradeLevel: 2, characterTypeId: dragonId, characterLevel: 5 },
      ])
      .returning();
    [low, top] = [rows[0]!.id, rows[1]!.id];
    await loadDefaultBehaviorTypes(db, B());
    behaviorId = (await listBehaviorTypes(db, B())).find((t) => t.name === "Yardımlaştı")!.id;
  });

  it("is changed only by a teacher of the class", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, B())).resolves.toBeUndefined();
    await expect(assertTeacherOfClass(fx.users.teacherA, B())).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.admin1, B())).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfClass(fx.users.parentA, B())).rejects.toMatchObject(FORBIDDEN);
  });

  it("follows the school until the teacher sets its own levels", async () => {
    const settings = await getClassLevelSettings(db, B());
    expect(settings).toMatchObject({ custom: false, thresholds: await getLevelThresholds(db, fx.school1.id) });
  });

  it("sets the level count and thresholds, raising students but lowering nobody", async () => {
    // Finishing a character is far away, so these tests are about levels only.
    const { raised } = await updateClassLevels(db, fx.users.teacherB, B(), [0, 3, 6], null, 1000);
    expect(raised).toBe(1);
    expect(await state(low)).toMatchObject({ level: 2 });
    expect(await state(top)).toMatchObject({ level: 5 }); // above the new count: kept

    expect(await getClassLevelSettings(db, B())).toMatchObject({ custom: true, thresholds: [0, 3, 6], completeXp: 1000 });
    const [audit] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "class.character_levels_update"), eq(auditLog.entityId, B())));
    expect(audit).toMatchObject({
      actorId: fx.users.teacherB.id,
      data: { to: [0, 3, 6], completeXp: { to: 1000 }, raisedStudents: 1 },
    });

    const board = await listBoardStudents(db, B());
    expect(board.find((s) => s.id === top)).toMatchObject({ level: 5, maxLevel: 3, progress: 0, nextStageName: null });
    expect(board.find((s) => s.id === low)).toMatchObject({ level: 2, maxLevel: 3, nextStageName: "Genç" });
  });

  it("uses the class levels for scoring, capped at the class level count", async () => {
    await setXp(low, 5);
    const give = (batchId = newUuid()) =>
      giveBehavior(db, fx.users.teacherB, B(), { studentIds: [low], behaviorTypeId: behaviorId, note: null, batchId });
    expect((await give()).levelUps.map((u) => u.toLevel)).toEqual([3]);
    await setXp(low, 100);
    expect((await give()).levelUps).toEqual([]);
  });

  it("is not touched by school threshold changes", async () => {
    await db.update(student).set({ xp: 4, characterLevel: 2 }).where(eq(student.id, low));
    await updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 1, 2, 3, 4]);
    expect(await state(low)).toMatchObject({ level: 2 });
    await updateLevelThresholds(db, fx.users.admin1, fx.school1.id, [0, 500, 600, 700, 800]);
  });

  it("goes back to the school levels", async () => {
    await setXp(low, 550);
    await updateClassLevels(db, fx.users.teacherB, B(), null);
    expect(await getClassLevelSettings(db, B())).toMatchObject({ custom: false, thresholds: [0, 500, 600, 700, 800] });
    expect(await state(low)).toMatchObject({ level: 2 });
  });

  it("offers every active school type until the teacher picks", async () => {
    const { custom, types } = await getClassCharacterTypes(db, B());
    expect(custom).toBe(false);
    expect(types.map((t) => [t.id, t.selected])).toEqual([
      [dragonId, true],
      [owlId, true],
    ]);
  });

  it("moves students of a removed type to the first picked one and keeps their level", async () => {
    const before = await state(top);
    const { moved } = await updateClassCharacterTypes(db, fx.users.teacherB, B(), [owlId]);
    expect(moved).toBe(3); // Can, Deniz, Elif
    expect(await state(top)).toEqual({ ...before, typeId: owlId });
    expect((await listClassCharacterTypes(db, B())).map((t) => t.id)).toEqual([owlId]);

    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "class.character_types_update"));
    expect(audits.at(-1)!.data).toMatchObject({ from: null, to: [owlId], movedTo: owlId, movedStudents: 3 });

    // Class A is untouched.
    expect((await listClassCharacterTypes(db, fx.classes.classA.id)).map((t) => t.id)).toEqual([dragonId, owlId]);
  });

  it("gives new students the first picked type", async () => {
    const [created] = await addStudents(db, fx.users.teacherB, B(), [{ firstName: "Fatma", lastInitial: null }], 2);
    expect(await state(created!.id)).toMatchObject({ typeId: owlId });
  });

  it("rejects another school's type and an empty pick", async () => {
    await expect(updateClassCharacterTypes(db, fx.users.teacherB, B(), [robotId])).rejects.toBeInstanceOf(UserError);
    await expect(updateClassCharacterTypes(db, fx.users.teacherB, B(), [])).rejects.toBeInstanceOf(UserError);
  });

  it("falls back to the school types when the admin deactivates every picked type", async () => {
    await db.update(characterType).set({ active: false }).where(eq(characterType.id, owlId));
    expect(await getClassCharacterTypes(db, B())).toMatchObject({ custom: false });
    await db.update(characterType).set({ active: true }).where(eq(characterType.id, owlId));
  });

  it("goes back to the school types without moving anyone", async () => {
    expect(await updateClassCharacterTypes(db, fx.users.teacherB, B(), null)).toEqual({ moved: 0 });
    expect((await listClassCharacterTypes(db, B())).map((t) => t.id)).toEqual([dragonId, owlId]);
    expect(await state(top)).toMatchObject({ typeId: owlId });
  });
});

describe("class character order and stage names", () => {
  const A = () => fx.classes.classA.id;
  const B = () => fx.classes.classB.id;

  it("keeps the teacher's order; the first type goes to new students", async () => {
    await updateClassCharacterTypes(db, fx.users.teacherB, B(), [owlId, dragonId]);
    expect((await listClassCharacterTypes(db, B())).map((t) => t.id)).toEqual([owlId, dragonId]);
    const [created] = await addStudents(db, fx.users.teacherB, B(), [{ firstName: "Gül", lastInitial: null }], 2);
    expect(await state(created!.id)).toMatchObject({ typeId: owlId });

    await updateClassCharacterTypes(db, fx.users.teacherB, B(), [dragonId, owlId]);
    expect((await listClassCharacterTypes(db, B())).map((t) => t.id)).toEqual([dragonId, owlId]);
    // Class A still follows the school order.
    expect((await listClassCharacterTypes(db, A())).map((t) => t.id)).toEqual([dragonId, owlId]);
  });

  it("shows the class's stage names in that class only", async () => {
    const names = ["Sihirli yumurta", "", "Genç", "  ", "Ejder kral"];
    await updateClassStageNames(db, fx.users.teacherB, B(), dragonId, names);

    const types = await getClassCharacterTypes(db, B());
    const dragon = types.types.find((t) => t.id === dragonId)!;
    // "Genç" equals the school name, so it is not stored as the class's own.
    expect(dragon.classStageNames).toEqual(["Sihirli yumurta", null, null, null, "Ejder kral"]);
    expect(dragon.stages.map((s) => s.name)).toEqual(["Sihirli yumurta", "Yavru", "Genç", "Güçlü", "Ejder kral"]);
    expect(dragon.stages[0]!.assetUrl).toBe("/characters/ejderha/1.svg");

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.action, "class.character_stages_update"));
    expect(audit).toMatchObject({ entityId: B(), data: { characterTypeId: dragonId, to: ["Sihirli yumurta", null, null, null, "Ejder kral"] } });

    const [inB] = await db.insert(student).values({ classId: B(), firstName: "Hale", gradeLevel: 2, characterTypeId: dragonId }).returning();
    const [withB] = await withStages(db, [{ ...inB!, classId: B() }]);
    expect(withB!.stage.name).toBe("Sihirli yumurta");
    expect((await listBoardStudents(db, B())).find((s) => s.id === inB!.id)!.stage.name).toBe("Sihirli yumurta");

    // Class A keeps the school names.
    const [inA] = await withStages(db, [{ characterTypeId: dragonId, characterLevel: 1, classId: A() }]);
    expect(inA!.stage.name).toBe("Yumurta");
    expect((await getClassCharacterTypes(db, A())).types.find((t) => t.id === dragonId)!.stages[0]!.name).toBe("Yumurta");
  });

  it("names the level-up celebration with the class's names", async () => {
    const [kid] = await db
      .insert(student)
      .values({ classId: B(), firstName: "İpek", gradeLevel: 2, characterTypeId: dragonId, xp: 0 })
      .returning();
    const behaviorId = (await listBehaviorTypes(db, B())).find((t) => t.name === "Harika iş")!.id;
    await db.update(student).set({ xp: 499 }).where(eq(student.id, kid!.id)); // school levels: 500 for level 2
    const result = await giveBehavior(db, fx.users.teacherB, B(), {
      studentIds: [kid!.id],
      behaviorTypeId: behaviorId,
      note: null,
      batchId: newUuid(),
    });
    expect(result.levelUps[0]).toMatchObject({ from: { name: "Sihirli yumurta" }, to: { name: "Yavru" } });
  });

  it("goes back to the school names and rejects types the class cannot use", async () => {
    await updateClassStageNames(db, fx.users.teacherB, B(), dragonId, ["", "", "", "", ""]);
    const dragon = (await getClassCharacterTypes(db, B())).types.find((t) => t.id === dragonId)!;
    expect(dragon.classStageNames).toEqual([null, null, null, null, null]);
    expect(dragon.stages[0]!.name).toBe("Yumurta");

    await expect(updateClassStageNames(db, fx.users.teacherB, B(), robotId, STAGE_NAMES)).rejects.toBeInstanceOf(UserError);
  });
});
