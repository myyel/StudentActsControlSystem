import { and, asc, count, eq, inArray, isNull, lt, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import {
  characterLevel,
  characterStage,
  characterType,
  classCharacterLevel,
  classCharacterStageName,
  classCharacterType,
  school,
  schoolClass,
  student,
  studentCharacterCompletion,
} from "@/server/db/schema";
import {
  characterProgress,
  DEFAULT_LEVEL_THRESHOLDS,
  defaultCompleteXp,
  levelForXp,
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
/** School stages per type and level, plus the teachers' stage names per class. */
export type StageMap = { stages: Map<string, Map<number, Stage>>; classNames: Map<string, string> };

const nameKey = (classId: string, typeId: string, level: number) => `${classId}:${typeId}:${level}`;

export type LevelUp = {
  studentId: string;
  fromLevel: number;
  toLevel: number;
  from: Stage;
  to: Stage;
  /** The character was finished: `from` is its last stage, `to` the first stage of the next one. */
  newCharacter?: true;
};

/** A student's own XP on the current character (PRD §4.6). */
const characterXp = sql`${student.xp} - ${student.characterXpBase}`;

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

/** A school's levels and the character XP that finishes a character. */
export async function getSchoolLevelSettings(db: DbOrTx, schoolId: string) {
  const [thresholds, [row]] = await Promise.all([
    getLevelThresholds(db, schoolId),
    db.select({ completeXp: school.characterCompleteXp }).from(school).where(eq(school.id, schoolId)),
  ]);
  return { thresholds, completeXp: validCompleteXp(thresholds, row?.completeXp) };
}

/** A stored value at or below the last level (thresholds changed since) falls back to the default. */
function validCompleteXp(thresholds: readonly number[], stored: number | null | undefined) {
  return stored != null && stored > thresholds[thresholds.length - 1]! ? stored : defaultCompleteXp(thresholds);
}

/** SQL twin of levelForXp. */
function levelCase(thresholds: readonly number[], xp: SQL): SQL {
  const whens = thresholds
    .map((t, i) => ({ t, level: i + 1 }))
    .slice(1)
    .reverse()
    .map(({ t, level }) => sql`when ${xp} >= ${t} then ${level}`);
  return sql`(case ${sql.join(whens, sql` `)} else 1 end)::smallint`;
}

/** A class's own levels (2–5 thresholds), or null when it follows the school. */
async function classOwnThresholds(db: DbOrTx, classId: string): Promise<number[] | null> {
  const rows = await db
    .select({ xpThreshold: classCharacterLevel.xpThreshold })
    .from(classCharacterLevel)
    .where(eq(classCharacterLevel.classId, classId))
    .orderBy(asc(classCharacterLevel.level));
  return rows.length >= 2 ? rows.map((r) => r.xpThreshold) : null;
}

async function classRow(db: DbOrTx, classId: string) {
  const [cls] = await db
    .select({ schoolId: schoolClass.schoolId, completeXp: schoolClass.characterCompleteXp })
    .from(schoolClass)
    .where(eq(schoolClass.id, classId));
  if (!cls) throw forbidden();
  return cls;
}

async function schoolIdOfClass(db: DbOrTx, classId: string) {
  return (await classRow(db, classId)).schoolId;
}

/**
 * Levels of a class: the teacher's own, or the school's. The level count is `thresholds.length`;
 * `completeXp` is the character XP at which a student moves on to the next character.
 */
export async function getClassLevelSettings(db: DbOrTx, classId: string) {
  const [cls, own] = await Promise.all([classRow(db, classId), classOwnThresholds(db, classId)]);
  if (own) {
    return { thresholds: own, completeXp: validCompleteXp(own, cls.completeXp), custom: true, schoolId: cls.schoolId };
  }
  return { ...(await getSchoolLevelSettings(db, cls.schoolId)), custom: false, schoolId: cls.schoolId };
}

export async function getClassLevelThresholds(db: DbOrTx, classId: string) {
  return (await getClassLevelSettings(db, classId)).thresholds;
}

/**
 * Call only after assertAdminOfSchool. Students whose XP now reaches a higher level are
 * raised; nobody is lowered (levels never drop, PRD §4.6). Classes with their own levels
 * are not affected.
 */
export async function updateLevelThresholds(
  db: Db,
  actor: AuthUser,
  schoolId: string,
  thresholds: number[],
  ip?: string | null,
  /** Character XP that finishes a character; null keeps the default (defaultCompleteXp). */
  completeXp: number | null = null,
) {
  return db.transaction(async (tx) => {
    const previous = await getSchoolLevelSettings(tx, schoolId);
    await tx.update(school).set({ characterCompleteXp: completeXp }).where(eq(school.id, schoolId));
    await tx
      .insert(characterLevel)
      .values(thresholds.map((xpThreshold, i) => ({ schoolId, level: i + 1, xpThreshold })))
      .onConflictDoUpdate({
        target: [characterLevel.schoolId, characterLevel.level],
        set: { xpThreshold: sql`excluded.xp_threshold` },
      });

    // A student past the new completion XP moves on with the next positive score, so the
    // change of character is celebrated rather than happening silently here.
    const target = levelCase(thresholds, characterXp);
    const raised = await tx
      .update(student)
      .set({ characterLevel: target })
      .where(
        and(
          inArray(student.classId, tx.select({ id: schoolClass.id }).from(schoolClass).where(eq(schoolClass.schoolId, schoolId))),
          notInArray(student.classId, tx.selectDistinct({ id: classCharacterLevel.classId }).from(classCharacterLevel)),
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
      data: {
        from: previous.thresholds,
        to: thresholds,
        completeXp: { from: previous.completeXp, to: validCompleteXp(thresholds, completeXp) },
        raisedStudents: raised.length,
      },
      ip,
    });
    return { raised: raised.length };
  });
}

/**
 * Call only after assertTeacherOfClass. `null` makes the class follow the school again.
 * Students who now reach a higher level are raised; a smaller level count lowers nobody: they
 * keep their level and picture and read as "last level".
 */
export async function updateClassLevels(
  db: Db,
  actor: AuthUser,
  classId: string,
  thresholds: number[] | null,
  ip?: string | null,
  /** With own thresholds: character XP that finishes a character; null keeps the default. */
  completeXp: number | null = null,
) {
  return db.transaction(async (tx) => {
    const previous = await getClassLevelSettings(tx, classId);
    await tx.delete(classCharacterLevel).where(eq(classCharacterLevel.classId, classId));
    await tx
      .update(schoolClass)
      .set({ characterCompleteXp: thresholds ? completeXp : null })
      .where(eq(schoolClass.id, classId));
    if (thresholds) {
      await tx
        .insert(classCharacterLevel)
        .values(thresholds.map((xpThreshold, i) => ({ classId, level: i + 1, xpThreshold })));
    }
    const effective = thresholds ?? (await getLevelThresholds(tx, previous.schoolId));

    const target = levelCase(effective, characterXp);
    const raised = await tx
      .update(student)
      .set({ characterLevel: target })
      .where(and(eq(student.classId, classId), lt(student.characterLevel, target)))
      .returning({ id: student.id });

    await writeAudit(tx, {
      action: "class.character_levels_update",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: previous.schoolId,
      data: {
        from: previous.custom ? previous.thresholds : null,
        to: thresholds,
        completeXp: { from: previous.completeXp, to: (await getClassLevelSettings(tx, classId)).completeXp },
        raisedStudents: raised.length,
      },
      ip,
    });
    return { raised: raised.length };
  });
}

/**
 * Active school types and whether the class offers each, with the class's stage names. Picked
 * types come first in the teacher's order, the rest follow in school order. A class without its
 * own pick, or whose picked types were all deactivated by the admin, offers every active type.
 */
export async function getClassCharacterTypes(db: DbOrTx, classId: string) {
  const schoolId = await schoolIdOfClass(db, classId);
  const [types, picked] = await Promise.all([
    listCharacterTypes(db, schoolId, { activeOnly: true, classId }),
    db
      .select({ id: classCharacterType.characterTypeId, sortOrder: classCharacterType.sortOrder })
      .from(classCharacterType)
      .where(eq(classCharacterType.classId, classId)),
  ]);
  const order = new Map(picked.map((p) => [p.id, p.sortOrder]));
  const custom = types.some((t) => order.has(t.id));
  const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  // Array.sort is stable: ties (and unpicked types) keep the school order.
  const sorted = custom ? [...types].sort((a, b) => rank(a.id) - rank(b.id)) : types;
  return { schoolId, custom, types: sorted.map((t) => ({ ...t, selected: !custom || order.has(t.id) })) };
}

/** Types the class's students can have, in class order; the first one goes to new students. */
export async function listClassCharacterTypes(db: DbOrTx, classId: string) {
  return (await getClassCharacterTypes(db, classId)).types.filter((t) => t.selected);
}

/**
 * Students per character type and per level in a class, for the teacher's settings screen
 * ("4 öğrenci Ejderha'ya geçecek"). Call only after assertTeacherOfClass.
 */
export async function countClassStudents(db: DbOrTx, classId: string) {
  const rows = await db
    .select({ typeId: student.characterTypeId, level: student.characterLevel, n: count() })
    .from(student)
    .where(and(eq(student.classId, classId), isNull(student.deletedAt)))
    .groupBy(student.characterTypeId, student.characterLevel);
  const byType: Record<string, number> = {};
  const byLevel: Record<number, number> = {};
  for (const r of rows) {
    byType[r.typeId] = (byType[r.typeId] ?? 0) + r.n;
    byLevel[r.level] = (byLevel[r.level] ?? 0) + r.n;
  }
  return { byType, byLevel };
}

/**
 * Call only after assertTeacherOfClass. `null` offers every active school type again. Students
 * whose type is no longer offered move to the first offered type; their level is kept.
 */
export async function updateClassCharacterTypes(
  db: Db,
  actor: AuthUser,
  classId: string,
  typeIds: string[] | null,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const before = await getClassCharacterTypes(tx, classId);
    // In the order the teacher gave.
    const offered = typeIds
      ? [...new Set(typeIds)].flatMap((id) => before.types.filter((t) => t.id === id))
      : [...before.types].sort((a, b) => a.sortOrder - b.sortOrder);
    if (typeIds && offered.length !== new Set(typeIds).size) {
      throw new UserError("Bu karakter türü şu an kullanılamıyor.");
    }
    if (offered.length === 0) throw new UserError("En az bir karakter türü seçin.");

    await tx.delete(classCharacterType).where(eq(classCharacterType.classId, classId));
    if (typeIds) {
      await tx
        .insert(classCharacterType)
        .values(offered.map((t, sortOrder) => ({ classId, characterTypeId: t.id, sortOrder })));
    }

    // Following the school again moves nobody: every active type is offered, and a type the
    // admin deactivated stays with its students (PRD §4.6).
    const target = offered[0]!.id;
    const moved = typeIds
      ? await tx
          .update(student)
          .set({ characterTypeId: target })
          .where(
            and(
              eq(student.classId, classId),
              isNull(student.deletedAt),
              notInArray(
                student.characterTypeId,
                offered.map((t) => t.id),
              ),
            ),
          )
          .returning({ id: student.id })
      : [];

    await writeAudit(tx, {
      action: "class.character_types_update",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: before.schoolId,
      data: {
        from: before.custom ? before.types.filter((t) => t.selected).map((t) => t.id) : null,
        to: typeIds ? offered.map((t) => t.id) : null,
        movedTo: moved.length > 0 ? target : null,
        movedStudents: moved.length,
      },
      ip,
    });
    return { moved: moved.length };
  });
}

/**
 * Stage names and pictures per type and level (missing stages fall back to a placeholder), and the
 * stage names teachers gave in the given classes.
 */
export async function getStageMap(db: DbOrTx, typeIds: string[], classIds: string[] = []): Promise<StageMap> {
  const map: StageMap = { stages: new Map(), classNames: new Map() };
  if (typeIds.length === 0) return map;
  const types = [...new Set(typeIds)];
  const [rows, names] = await Promise.all([
    db.select().from(characterStage).where(inArray(characterStage.characterTypeId, types)),
    classIds.length === 0
      ? []
      : db
          .select()
          .from(classCharacterStageName)
          .where(
            and(
              inArray(classCharacterStageName.classId, [...new Set(classIds)]),
              inArray(classCharacterStageName.characterTypeId, types),
            ),
          ),
  ]);
  for (const r of rows) {
    if (!map.stages.has(r.characterTypeId)) map.stages.set(r.characterTypeId, new Map());
    map.stages.get(r.characterTypeId)!.set(r.level, { name: r.name, assetUrl: r.assetUrl });
  }
  for (const n of names) map.classNames.set(nameKey(n.classId, n.characterTypeId, n.level), n.name);
  return map;
}

/** The stage of a type at a level; with a class, the teacher's stage name wins. */
export function stageOf(map: StageMap, typeId: string, level: number, classId?: string): Stage {
  const stage = map.stages.get(typeId)?.get(level) ?? { name: `${level}. seviye`, assetUrl: PLACEHOLDER_ASSET_URL };
  const name = classId ? map.classNames.get(nameKey(classId, typeId, level)) : undefined;
  return name ? { ...stage, name } : stage;
}

/** Adds the current stage to student rows, named as in each student's class. */
export async function withStages<T extends { characterTypeId: string; characterLevel: number; classId: string }>(
  db: DbOrTx,
  rows: T[],
) {
  const map = await getStageMap(
    db,
    rows.map((r) => r.characterTypeId),
    rows.map((r) => r.classId),
  );
  return rows.map((r) => ({ ...r, stage: stageOf(map, r.characterTypeId, r.characterLevel, r.classId) }));
}

type LevelChange = {
  studentId: string;
  fromTypeId: string;
  fromLevel: number;
  toTypeId: string;
  toLevel: number;
  newCharacter?: true;
};

async function describeLevelUps(db: DbOrTx, classId: string, changes: LevelChange[]): Promise<LevelUp[]> {
  if (changes.length === 0) return [];
  const map = await getStageMap(
    db,
    changes.flatMap((c) => [c.fromTypeId, c.toTypeId]),
    [classId],
  );
  return changes.map(({ studentId, fromTypeId, fromLevel, toTypeId, toLevel, newCharacter }) => ({
    studentId,
    fromLevel,
    toLevel,
    from: stageOf(map, fromTypeId, fromLevel, classId),
    to: stageOf(map, toTypeId, toLevel, classId),
    ...(newCharacter && { newCharacter }),
  }));
}

/** More characters than this in one score means broken settings, not progress. */
const MAX_COMPLETIONS_PER_SCORE = 10;

/**
 * Applies an XP gain to the characters of students of one class, inside the caller's transaction:
 * raises the level and, once the character's XP reaches the class's completion XP, records the
 * character as finished and starts the next one in the class's order (after the last, the first
 * again) at level 1. Rows must already be locked; `xp` is the new value. Nothing here ever
 * moves a character back: deleting events lowers XP only.
 */
export async function raiseLevels(
  tx: DbOrTx,
  classId: string,
  rows: { id: string; xp: number; characterLevel: number; characterTypeId: string; characterXpBase: number }[],
): Promise<LevelUp[]> {
  const { thresholds, completeXp } = await getClassLevelSettings(tx, classId);
  const maxLevel = thresholds.length;
  let order: string[] | undefined;
  const changes: LevelChange[] = [];

  for (const row of rows) {
    let { characterTypeId: typeId, characterLevel: level, characterXpBase: base } = row;
    const completed: { characterTypeId: string; level: number }[] = [];

    for (;;) {
      const own = row.xp - base;
      const target = levelForXp(thresholds, own);
      if (target > level) {
        changes.push({ studentId: row.id, fromTypeId: typeId, fromLevel: level, toTypeId: typeId, toLevel: target });
        level = target;
      }
      if (own < completeXp || completed.length >= MAX_COMPLETIONS_PER_SCORE) break;

      order ??= (await listClassCharacterTypes(tx, classId)).map((t) => t.id);
      // A type the class no longer offers continues from the start of the order.
      const next = order[(order.indexOf(typeId) + 1) % order.length]!;
      const finalLevel = Math.max(level, maxLevel);
      completed.push({ characterTypeId: typeId, level: finalLevel });
      changes.push({
        studentId: row.id,
        fromTypeId: typeId,
        fromLevel: finalLevel,
        toTypeId: next,
        toLevel: 1,
        newCharacter: true,
      });
      typeId = next;
      level = 1;
      base += completeXp;
    }

    if (completed.length > 0) {
      await tx.insert(studentCharacterCompletion).values(completed.map((c) => ({ studentId: row.id, ...c })));
    }
    if (typeId !== row.characterTypeId || level !== row.characterLevel || base !== row.characterXpBase) {
      await tx
        .update(student)
        .set({ characterTypeId: typeId, characterLevel: level, characterXpBase: base })
        .where(eq(student.id, row.id));
    }
  }
  return describeLevelUps(tx, classId, changes);
}

/** Characters a student finished, oldest first, as the stage they were finished at. */
export async function listCompletedCharacters(db: DbOrTx, studentId: string, classId: string) {
  const rows = await db
    .select({
      id: studentCharacterCompletion.id,
      characterTypeId: studentCharacterCompletion.characterTypeId,
      level: studentCharacterCompletion.level,
      typeName: characterType.name,
      completedAt: studentCharacterCompletion.completedAt,
    })
    .from(studentCharacterCompletion)
    .innerJoin(characterType, eq(characterType.id, studentCharacterCompletion.characterTypeId))
    .where(eq(studentCharacterCompletion.studentId, studentId))
    .orderBy(asc(studentCharacterCompletion.completedAt), asc(studentCharacterCompletion.id));
  const map = await getStageMap(
    db,
    rows.map((r) => r.characterTypeId),
    [classId],
  );
  return rows.map((r) => ({
    id: r.id,
    typeName: r.typeName,
    completedAt: r.completedAt,
    stage: stageOf(map, r.characterTypeId, r.level, classId),
  }));
}

/**
 * Types available to a school, with all five stages. With a class, stages carry the class's names
 * and `schoolStageNames` / `classStageNames` (null = school name) tell them apart.
 */
export async function listCharacterTypes(
  db: DbOrTx,
  schoolId: string,
  opts: { activeOnly?: boolean; classId?: string } = {},
) {
  const types = await db
    .select()
    .from(characterType)
    .where(and(availableTo(schoolId), opts.activeOnly ? eq(characterType.active, true) : undefined))
    .orderBy(asc(characterType.sortOrder), asc(characterType.name));
  const { classId } = opts;
  const map = await getStageMap(
    db,
    types.map((t) => t.id),
    classId ? [classId] : [],
  );
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
  const ownName = (typeId: string, level: number) =>
    classId ? (map.classNames.get(nameKey(classId, typeId, level)) ?? null) : null;
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    active: t.active,
    sortOrder: t.sortOrder,
    editable: t.schoolId === schoolId,
    stages: levels.map((level) => stageOf(map, t.id, level, classId)),
    schoolStageNames: levels.map((level) => stageOf(map, t.id, level).name),
    classStageNames: levels.map((level) => ownName(t.id, level)),
  }));
}

/**
 * Call only after assertTeacherOfClass. The class's own stage names for one type; an empty or
 * null name (or the school's own name) shows the school's name again.
 */
export async function updateClassStageNames(
  db: Db,
  actor: AuthUser,
  classId: string,
  typeId: string,
  names: (string | null)[],
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const { schoolId, types } = await getClassCharacterTypes(tx, classId);
    const type = types.find((t) => t.id === typeId);
    if (!type) throw new UserError("Bu karakter türü şu an kullanılamıyor.");

    const own = names.map((n, i) => {
      const name = n?.trim() ?? "";
      return name && name !== type.schoolStageNames[i] ? name : null;
    });
    await tx
      .delete(classCharacterStageName)
      .where(and(eq(classCharacterStageName.classId, classId), eq(classCharacterStageName.characterTypeId, typeId)));
    const rows = own.flatMap((name, i) => (name ? [{ classId, characterTypeId: typeId, level: i + 1, name }] : []));
    if (rows.length > 0) await tx.insert(classCharacterStageName).values(rows);

    await writeAudit(tx, {
      action: "class.character_stages_update",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId,
      data: { characterTypeId: typeId, from: type.classStageNames, to: own },
      ip,
    });
  });
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

/** Call only after assertTeacherOfStudent. */
export async function getStudentCharacter(db: Db, studentId: string) {
  const [row] = await db
    .select({
      characterTypeId: student.characterTypeId,
      characterLevel: student.characterLevel,
      xp: student.xp,
      characterXpBase: student.characterXpBase,
      classId: student.classId,
    })
    .from(student)
    .where(eq(student.id, studentId));
  if (!row) throw forbidden();

  const [{ thresholds, completeXp }, [withStage], types, completed] = await Promise.all([
    getClassLevelSettings(db, row.classId),
    withStages(db, [row]),
    listClassCharacterTypes(db, row.classId),
    listCompletedCharacters(db, studentId, row.classId),
  ]);
  const level = row.characterLevel;
  const maxLevel = thresholds.length;
  const own = Math.max(row.xp - row.characterXpBase, 0);
  // After the last type the order starts again.
  const next = types[(types.findIndex((t) => t.id === row.characterTypeId) + 1) % types.length];
  return {
    characterTypeId: row.characterTypeId,
    level,
    maxLevel,
    /** XP on the current character; `nextThreshold` is what the next level or the next character needs. */
    xp: own,
    stage: withStage!.stage,
    progress: characterProgress(thresholds, completeXp, level, own),
    nextThreshold: level < maxLevel ? thresholds[level]! : completeXp,
    nextCharacter: next ? { name: next.name, assetUrl: next.stages[0]!.assetUrl } : null,
    completed,
  };
}

/**
 * Board mode (projected to children): only what the cards show. XP, balance and negative
 * events are never sent; order is by name, never by score (CLAUDE.md rule 7).
 * Call only after assertTeacherOfClass.
 */
export async function listBoardStudents(db: Db, classId: string) {
  const [{ thresholds, completeXp }, rows] = await Promise.all([
    getClassLevelSettings(db, classId),
    db
      .select({
        id: student.id,
        firstName: student.firstName,
        lastInitial: student.lastInitial,
        characterTypeId: student.characterTypeId,
        characterLevel: student.characterLevel,
        xp: student.xp,
        characterXpBase: student.characterXpBase,
      })
      .from(student)
      .where(and(eq(student.classId, classId), eq(student.active, true), isNull(student.deletedAt))),
  ]);
  const map = await getStageMap(
    db,
    rows.map((r) => r.characterTypeId),
    [classId],
  );
  const maxLevel = thresholds.length;
  return rows
    .map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastInitial: s.lastInitial,
      characterTypeId: s.characterTypeId,
      level: s.characterLevel,
      maxLevel,
      stage: stageOf(map, s.characterTypeId, s.characterLevel, classId),
      // "Fidan olmaya çok az kaldı!" on the board: a name, not a number.
      nextStageName: s.characterLevel < maxLevel ? stageOf(map, s.characterTypeId, s.characterLevel + 1, classId).name : null,
      progress: characterProgress(thresholds, completeXp, s.characterLevel, s.xp - s.characterXpBase),
    }))
    .sort(byName);
}

export type BoardStudent = Awaited<ReturnType<typeof listBoardStudents>>[number];
