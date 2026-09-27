import { and, asc, count, eq, inArray, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { characterLevel, characterStage, characterType, schoolClass, student } from "@/server/db/schema";
import {
  DEFAULT_LEVEL_THRESHOLDS,
  levelForXp,
  levelProgress,
  MAX_LEVEL,
  PLACEHOLDER_ASSET_URL,
} from "@/lib/character";
import type { StudentName } from "@/lib/student-names";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import type { CharacterTypeInput } from "@/server/validation/character";
import { writeAudit } from "./audit";

export type Stage = { name: string; assetUrl: string };
export type StageMap = Map<string, Map<number, Stage>>;

export type LevelUp = { studentId: string; fromLevel: number; toLevel: number; from: Stage; to: Stage };

const byName = (a: StudentName, b: StudentName) =>
  a.firstName.localeCompare(b.firstName, "tr") || (a.lastInitial ?? "").localeCompare(b.lastInitial ?? "", "tr");

/** Types a school can use: its own and the global ones. */
const availableTo = (schoolId: string) => or(eq(characterType.schoolId, schoolId), isNull(characterType.schoolId));

export async function getLevelThresholds(db: DbOrTx, schoolId: string): Promise<number[]> {
  const rows = await db
    .select({ level: characterLevel.level, xpThreshold: characterLevel.xpThreshold })
    .from(characterLevel)
    .where(eq(characterLevel.schoolId, schoolId))
    .orderBy(asc(characterLevel.level));
  if (rows.length !== MAX_LEVEL) return [...DEFAULT_LEVEL_THRESHOLDS];
  return rows.map((r) => r.xpThreshold);
}

/** SQL twin of levelForXp. */
function levelCase(thresholds: readonly number[], xp: SQL | typeof student.xp): SQL {
  const whens = thresholds
    .map((t, i) => ({ t, level: i + 1 }))
    .slice(1)
    .reverse()
    .map(({ t, level }) => sql`when ${xp} >= ${t} then ${level}`);
  return sql`(case ${sql.join(whens, sql` `)} else 1 end)::smallint`;
}

/**
 * Call only after assertAdminOfSchool. Students whose XP now reaches a higher level are
 * raised; nobody is lowered (levels never drop, PRD §4.6).
 */
export async function updateLevelThresholds(
  db: Db,
  actor: AuthUser,
  schoolId: string,
  thresholds: number[],
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const previous = await getLevelThresholds(tx, schoolId);
    await tx
      .insert(characterLevel)
      .values(thresholds.map((xpThreshold, i) => ({ schoolId, level: i + 1, xpThreshold })))
      .onConflictDoUpdate({
        target: [characterLevel.schoolId, characterLevel.level],
        set: { xpThreshold: sql`excluded.xp_threshold` },
      });

    const target = levelCase(thresholds, student.xp);
    const raised = await tx
      .update(student)
      .set({ characterLevel: target })
      .where(
        and(
          inArray(student.classId, tx.select({ id: schoolClass.id }).from(schoolClass).where(eq(schoolClass.schoolId, schoolId))),
          lt(student.characterLevel, target),
        ),
      )
      .returning({ id: student.id });

    await writeAudit(tx, {
      action: "character.thresholds_update",
      entity: "school",
      entityId: schoolId,
      actorId: actor.id,
      schoolId,
      data: { from: previous, to: thresholds, raisedStudents: raised.length },
      ip,
    });
    return { raised: raised.length };
  });
}

/** Stage names and pictures per type and level; missing stages fall back to a placeholder. */
export async function getStageMap(db: DbOrTx, typeIds: string[]): Promise<StageMap> {
  const map: StageMap = new Map();
  if (typeIds.length === 0) return map;
  const rows = await db
    .select()
    .from(characterStage)
    .where(inArray(characterStage.characterTypeId, [...new Set(typeIds)]));
  for (const r of rows) {
    if (!map.has(r.characterTypeId)) map.set(r.characterTypeId, new Map());
    map.get(r.characterTypeId)!.set(r.level, { name: r.name, assetUrl: r.assetUrl });
  }
  return map;
}

export const stageOf = (map: StageMap, typeId: string, level: number): Stage =>
  map.get(typeId)?.get(level) ?? { name: `${level}. seviye`, assetUrl: PLACEHOLDER_ASSET_URL };

/** Adds the current stage to student rows. */
export async function withStages<T extends { characterTypeId: string; characterLevel: number }>(db: DbOrTx, rows: T[]) {
  const map = await getStageMap(db, rows.map((r) => r.characterTypeId));
  return rows.map((r) => ({ ...r, stage: stageOf(map, r.characterTypeId, r.characterLevel) }));
}

export async function describeLevelUps(
  db: DbOrTx,
  ups: { studentId: string; characterTypeId: string; fromLevel: number; toLevel: number }[],
): Promise<LevelUp[]> {
  if (ups.length === 0) return [];
  const map = await getStageMap(db, ups.map((u) => u.characterTypeId));
  return ups.map(({ studentId, characterTypeId, fromLevel, toLevel }) => ({
    studentId,
    fromLevel,
    toLevel,
    from: stageOf(map, characterTypeId, fromLevel),
    to: stageOf(map, characterTypeId, toLevel),
  }));
}

/**
 * Raises the level of students whose XP changed, inside the caller's transaction.
 * Rows must already be locked; `xp` is the new value.
 */
export async function raiseLevels(
  tx: DbOrTx,
  schoolId: string,
  rows: { id: string; xp: number; characterLevel: number; characterTypeId: string }[],
): Promise<LevelUp[]> {
  const thresholds = await getLevelThresholds(tx, schoolId);
  const ups = rows.flatMap((r) => {
    const toLevel = levelForXp(thresholds, r.xp);
    return toLevel > r.characterLevel
      ? [{ studentId: r.id, characterTypeId: r.characterTypeId, fromLevel: r.characterLevel, toLevel }]
      : [];
  });
  for (const up of ups) {
    await tx
      .update(student)
      .set({ characterLevel: sql`greatest(${student.characterLevel}, ${up.toLevel})` })
      .where(eq(student.id, up.studentId));
  }
  return describeLevelUps(tx, ups);
}

/** Types available to a school, with all five stages. */
export async function listCharacterTypes(db: DbOrTx, schoolId: string, opts: { activeOnly?: boolean } = {}) {
  const types = await db
    .select()
    .from(characterType)
    .where(and(availableTo(schoolId), opts.activeOnly ? eq(characterType.active, true) : undefined))
    .orderBy(asc(characterType.sortOrder), asc(characterType.name));
  const map = await getStageMap(db, types.map((t) => t.id));
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    active: t.active,
    editable: t.schoolId === schoolId,
    stages: Array.from({ length: MAX_LEVEL }, (_, i) => stageOf(map, t.id, i + 1)),
  }));
}

/** Call only after assertAdminOfCharacterType. */
export async function updateCharacterType(
  db: Db,
  actor: AuthUser,
  typeId: string,
  input: CharacterTypeInput,
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const [type] = await tx.select().from(characterType).where(eq(characterType.id, typeId)).for("update");
    if (!type?.schoolId) throw forbidden();

    if (type.active && !input.active) {
      const [others] = await tx
        .select({ n: count() })
        .from(characterType)
        .where(and(availableTo(type.schoolId), eq(characterType.active, true), ne(characterType.id, typeId)));
      // New students get the first active type, so one must remain.
      if (!others?.n) throw new UserError("En az bir karakter türü aktif kalmalı.");
    }

    await tx.update(characterType).set({ name: input.name, active: input.active }).where(eq(characterType.id, typeId));
    await tx
      .insert(characterStage)
      .values(
        input.stageNames.map((name, i) => ({ characterTypeId: typeId, level: i + 1, name, assetUrl: PLACEHOLDER_ASSET_URL })),
      )
      .onConflictDoUpdate({
        target: [characterStage.characterTypeId, characterStage.level],
        set: { name: sql`excluded.name` },
      });

    await writeAudit(tx, {
      action: "character_type.update",
      entity: "character_type",
      entityId: typeId,
      actorId: actor.id,
      schoolId: type.schoolId,
      data: input,
      ip,
    });
  });
}

/** Call only after assertTeacherOfStudent. The level is kept: it belongs to the student, not the type. */
export async function setStudentCharacterType(
  db: Db,
  actor: AuthUser,
  studentId: string,
  characterTypeId: string,
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ from: student.characterTypeId, schoolId: schoolClass.schoolId })
      .from(student)
      .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
      .where(eq(student.id, studentId))
      .for("update", { of: student });
    if (!row) throw forbidden();
    if (row.from === characterTypeId) return;

    const [type] = await tx
      .select({ id: characterType.id, active: characterType.active })
      .from(characterType)
      .where(and(eq(characterType.id, characterTypeId), availableTo(row.schoolId)));
    if (!type) throw forbidden();
    if (!type.active) throw new UserError("Bu karakter türü şu an kullanılamıyor.");

    await tx.update(student).set({ characterTypeId }).where(eq(student.id, studentId));
    await writeAudit(tx, {
      action: "student.character_change",
      entity: "student",
      entityId: studentId,
      actorId: actor.id,
      schoolId: row.schoolId,
      data: { from: row.from, to: characterTypeId },
      ip,
    });
  });
}

/** Call only after assertTeacherOfStudent. */
export async function getStudentCharacter(db: Db, studentId: string) {
  const [row] = await db
    .select({
      characterTypeId: student.characterTypeId,
      characterLevel: student.characterLevel,
      xp: student.xp,
      schoolId: schoolClass.schoolId,
    })
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .where(eq(student.id, studentId));
  if (!row) throw forbidden();

  const [thresholds, [withStage], types] = await Promise.all([
    getLevelThresholds(db, row.schoolId),
    withStages(db, [row]),
    listCharacterTypes(db, row.schoolId, { activeOnly: true }),
  ]);
  const level = row.characterLevel;
  return {
    characterTypeId: row.characterTypeId,
    level,
    xp: row.xp,
    stage: withStage!.stage,
    progress: levelProgress(thresholds, level, row.xp),
    nextThreshold: level < MAX_LEVEL ? thresholds[level]! : null,
    // The student's type stays selectable even if it was deactivated later.
    types: types.map(({ id, name, stages }) => ({ id, name, assetUrl: stages[level - 1]!.assetUrl })),
  };
}

/**
 * Board mode (projected to children): only what the cards show. XP, balance and negative
 * events are never sent; order is by name, never by score (CLAUDE.md rule 7).
 * Call only after assertTeacherOfClass.
 */
export async function listBoardStudents(db: Db, classId: string) {
  const [cls] = await db.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
  if (!cls) throw forbidden();

  const [thresholds, rows] = await Promise.all([
    getLevelThresholds(db, cls.schoolId),
    db
      .select({
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        characterTypeId: student.characterTypeId,
        characterLevel: student.characterLevel,
        xp: student.xp,
      })
      .from(student)
      .where(and(eq(student.classId, classId), eq(student.active, true), isNull(student.deletedAt))),
  ]);
  const withStage = await withStages(db, rows);
  return withStage
    .map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastInitial: s.lastInitial,
      level: s.characterLevel,
      stage: s.stage,
      progress: levelProgress(thresholds, s.characterLevel, s.xp),
    }))
    .sort(byName);
}

export type BoardStudent = Awaited<ReturnType<typeof listBoardStudents>>[number];
