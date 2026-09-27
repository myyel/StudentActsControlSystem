import type { Metadata } from "next";
import { Board } from "@/components/board/board";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listBehaviorTypes } from "@/server/services/behavior-type";
import { listBoardStudents } from "@/server/services/character";
import { getClass } from "@/server/services/class";

export const metadata: Metadata = { title: "Tahta modu" };

export default async function BoardPage({ params }: PageProps<"/tahta/[sinifId]">) {
  const { sinifId } = await params;
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students, behaviors] = await Promise.all([
    getClass(db, sinifId),
    listBoardStudents(db, sinifId),
    listBehaviorTypes(db, sinifId, { scope: "school", activeOnly: true }),
  ]);

  return (
    <Board
      classId={sinifId}
      className={cls.name}
      students={students}
      // Children see this screen: positive behaviors only (CLAUDE.md rule 7).
      behaviors={behaviors.filter((b) => b.points > 0).map(({ id, name, icon, points }) => ({ id, name, icon, points }))}
    />
  );
}
