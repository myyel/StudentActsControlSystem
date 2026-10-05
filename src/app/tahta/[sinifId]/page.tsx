import type { Metadata } from "next";
import { Board } from "@/components/board/board";
import { ClassGoalBar } from "@/components/class-goal/class-goal-bar";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listBehaviorTypes } from "@/server/services/behavior-type";
import { listBoardStudents, listClassCharacterTypes } from "@/server/services/character";
import { getClass } from "@/server/services/class";
import { getClassActivities } from "@/server/services/class-activity";
import { getClassGoal } from "@/server/services/class-goal";

export const metadata: Metadata = { title: "Tahta modu" };

export default async function BoardPage({ params, searchParams }: PageProps<"/tahta/[sinifId]">) {
  const { sinifId } = await params;
  // ?karakter=<öğrenci> opens the character choice (student detail → "Tahtada birlikte seç").
  const { karakter } = await searchParams;
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students, behaviors, goal, activity] = await Promise.all([
    getClass(db, sinifId),
    listBoardStudents(db, sinifId),
    listBehaviorTypes(db, sinifId, { scope: "school", activeOnly: true }),
    getClassGoal(db, sinifId),
    getClassActivities(db, sinifId),
  ]);
  const characterTypes = await listClassCharacterTypes(db, sinifId);

  return (
    <Board
      classId={sinifId}
      className={cls.name}
      students={students}
      // A class total only: no names, no per-child numbers.
      goal={goal && <ClassGoalBar {...goal} large className="order-last w-full lg:order-none lg:w-auto lg:max-w-xl lg:flex-1" />}
      characterTypes={characterTypes.map(({ id, name, stages }) => ({ id, name, stages }))}
      // Only a student of this class (the board's own list) can be opened.
      activity={activity}
      chooseFor={typeof karakter === "string" && students.some((s) => s.id === karakter) ? karakter : undefined}
      // Children see this screen: positive behaviors only (CLAUDE.md rule 7).
      behaviors={behaviors.filter((b) => b.points > 0).map(({ id, name, icon, points }) => ({ id, name, icon, points }))}
    />
  );
}
