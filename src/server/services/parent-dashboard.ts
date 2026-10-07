import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { behaviorEvent, parentStudent, school, schoolClass, student } from "@/server/db/schema";
import { characterProgress } from "@/lib/character";
import { forbidden } from "@/server/auth/errors";
import { listBehaviorTypes } from "./behavior-type";
import { getClassLevelSettings, getStageMap, listCompletedCharacters, stageOf } from "./character";
import { homeCountsToday, homeXpToday } from "./home-behavior";
import { getRoadmapForParent } from "./progress";
import { getLast7Days } from "./timeline";

export const RECENT_EVENTS = 10;

/**
 * Everything on the parent dashboard for one child. The child is looked up through
 * parent_student (CLAUDE.md rule 3): an unlinked child is FORBIDDEN. Teacher notes and who
 * gave a score are not returned (phase 6 decision).
 */
export async function getParentDashboard(db: Db, parentId: string, studentId: string, now = new Date()) {
  const [child] = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      classId: student.classId,
      className: schoolClass.name,
      active: student.active,
      xp: student.xp,
      characterLevel: student.characterLevel,
      characterTypeId: student.characterTypeId,
      characterXpBase: student.characterXpBase,
      schoolId: schoolClass.schoolId,
      timeZone: school.timezone,
      homeDailyXpCap: schoolClass.homeDailyXpCap,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(and(eq(parentStudent.parentId, parentId), eq(parentStudent.studentId, studentId), isNull(student.deletedAt)));
  if (!child) throw forbidden();

  const [levels, completed, stageMap, week, recent, roadmap, homeTypes, todayHomeXp, todayCounts, [top]] = await Promise.all([
    getClassLevelSettings(db, child.classId),
    listCompletedCharacters(db, studentId, child.classId),
    getStageMap(db, [child.characterTypeId], [child.classId]),
    getLast7Days(db, studentId, child.timeZone, now),
    db
      .select({
        id: behaviorEvent.id,
        name: behaviorEvent.nameSnapshot,
        icon: behaviorEvent.iconSnapshot,
        points: behaviorEvent.pointsSnapshot,
        source: behaviorEvent.source,
        createdAt: behaviorEvent.createdAt,
      })
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.studentId, studentId), isNull(behaviorEvent.deletedAt)))
      .orderBy(desc(behaviorEvent.createdAt), desc(behaviorEvent.id))
      .limit(RECENT_EVENTS),
    getRoadmapForParent(db, parentId, studentId),
    listBehaviorTypes(db, child.classId, { scope: "home", activeOnly: true }),
    homeXpToday(db, studentId, child.timeZone, now),
    homeCountsToday(db, studentId, child.timeZone, now),
    // "En çok: 🤝 Yardımlaştı (8 kez)": the most frequent positive behavior of the last 7 days.
    db
      .select({ name: behaviorEvent.nameSnapshot, icon: behaviorEvent.iconSnapshot, count: sql<number>`count(*)::int` })
      .from(behaviorEvent)
      .where(
        and(
          eq(behaviorEvent.studentId, studentId),
          isNull(behaviorEvent.deletedAt),
          gt(behaviorEvent.pointsSnapshot, 0),
          gte(behaviorEvent.createdAt, new Date(now.getTime() - 7 * 86_400_000)),
        ),
      )
      .groupBy(behaviorEvent.nameSnapshot, behaviorEvent.iconSnapshot)
      .orderBy(desc(sql`count(*)`), behaviorEvent.nameSnapshot)
      .limit(1),
  ]);

  const { thresholds, completeXp } = levels;
  const level = child.characterLevel;
  const maxLevel = thresholds.length;
  // XP on the current character; earlier characters are in `completed`.
  const ownXp = Math.max(child.xp - child.characterXpBase, 0);
  return {
    child: {
      id: child.id,
      firstName: child.firstName,
      lastInitial: child.lastInitial,
      className: child.className,
      active: child.active,
    },
    timeZone: child.timeZone,
    character: {
      level,
      maxLevel,
      xp: ownXp,
      stage: stageOf(stageMap, child.characterTypeId, level, child.classId),
      nextStageName: level < maxLevel ? stageOf(stageMap, child.characterTypeId, level + 1, child.classId).name : null,
      progress: characterProgress(thresholds, completeXp, level, ownXp),
      nextThreshold: level < maxLevel ? thresholds[level]! : completeXp,
      completed,
    },
    week,
    weekBalance: week.reduce((sum, d) => sum + d.positive - d.negative, 0),
    weekPositive: week.reduce((sum, d) => sum + d.positive, 0),
    weekTop: top ?? null,
    recent,
    subjects: roadmap.subjects.map((s) => {
      const stages = s.topics.flatMap((t) => t.stages);
      return {
        id: s.id,
        name: s.name,
        completed: s.completed,
        total: s.total,
        current: stages.find((st) => st.status === "in_progress")?.name ?? null,
      };
    }),
    home: {
      types: homeTypes.map(({ id, name, icon, points }) => ({ id, name, icon, points })),
      todayXp: todayHomeXp,
      todayCounts,
      cap: child.homeDailyXpCap,
    },
  };
}

export type ParentDashboard = Awaited<ReturnType<typeof getParentDashboard>>;
