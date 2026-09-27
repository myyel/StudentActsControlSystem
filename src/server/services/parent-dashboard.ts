import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import { behaviorEvent, parentStudent, school, schoolClass, student } from "@/server/db/schema";
import { levelProgress, MAX_LEVEL } from "@/lib/character";
import { forbidden } from "@/server/auth/errors";
import { listBehaviorTypes } from "./behavior-type";
import { getLevelThresholds, withStages } from "./character";
import { homeXpToday } from "./home-behavior";
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

  const [thresholds, [withStage], week, recent, roadmap, homeTypes, todayHomeXp] = await Promise.all([
    getLevelThresholds(db, child.schoolId),
    withStages(db, [child]),
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
  ]);

  const level = child.characterLevel;
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
      xp: child.xp,
      stage: withStage!.stage,
      progress: levelProgress(thresholds, level, child.xp),
      nextThreshold: level < MAX_LEVEL ? thresholds[level]! : null,
    },
    week,
    weekBalance: week.reduce((sum, d) => sum + d.positive - d.negative, 0),
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
      cap: child.homeDailyXpCap,
    },
  };
}

export type ParentDashboard = Awaited<ReturnType<typeof getParentDashboard>>;
