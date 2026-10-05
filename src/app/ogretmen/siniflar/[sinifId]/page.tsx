import Link from "next/link";
import { AddStudentForm } from "@/components/classes/add-student-form";
import { BulkAddForm } from "@/components/classes/bulk-add-form";
import { ClassGoalCard } from "@/components/class-goal/class-goal-card";
import { ClassNav } from "@/components/classes/class-nav";
import { ScoringBoard } from "@/components/scoring/scoring-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGradeLevels } from "@/lib/grade-levels";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listBehaviorTypes } from "@/server/services/behavior-type";
import { getClass } from "@/server/services/class";
import { getClassGoal } from "@/server/services/class-goal";
import { withStages } from "@/server/services/character";
import { listStudentsForClass } from "@/server/services/student";

export default async function ClassPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students, behaviors, goal] = await Promise.all([
    getClass(db, sinifId),
    listStudentsForClass(db, sinifId),
    listBehaviorTypes(db, sinifId, { scope: "school", activeOnly: true }),
    getClassGoal(db, sinifId),
  ]);
  const active = await withStages(
    db,
    students.filter((s) => s.active).map((s) => ({ ...s, classId: sinifId })),
  );
  const inactive = students.filter((s) => !s.active);
  const withoutParent = active.filter((s) => s.parentCount === 0).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="puanlama" />
      <p className="-mt-3 text-sm text-muted-foreground">
        {formatGradeLevels(cls.gradeLevels)} · {cls.academicYear} · {active.length} öğrenci
      </p>
      {withoutParent > 0 && (
        // Information that leads to the action: one tap to the invite cards.
        <p className="-mt-2 rounded-2xl bg-sun-soft px-4 py-2 text-sm">
          <span aria-hidden>👪 </span>
          {withoutParent} öğrencinin velisi henüz bağlanmadı.{" "}
          <Link href={`/ogretmen/siniflar/${sinifId}/davetler`} className="inline-flex min-h-11 items-center font-bold underline underline-offset-2">
            Davet kartlarını üret →
          </Link>
        </p>
      )}

      <ScoringBoard
        classId={sinifId}
        gradeLevels={cls.gradeLevels}
        students={active.map(({ id, firstName, lastInitial, gradeLevel, xp, characterLevel, stage }) => ({
          id,
          firstName,
          lastInitial,
          gradeLevel,
          xp,
          level: characterLevel,
          stage,
        }))}
        behaviors={behaviors.map(({ id, name, icon, points }) => ({ id, name, icon, points }))}
      />

      {/* Remounts when a new goal starts, closing the form. */}
      <ClassGoalCard key={goal?.id ?? "none"} classId={sinifId} goal={goal} />

      {inactive.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Pasif öğrenciler ({inactive.length})
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {inactive.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/ogretmen/siniflar/${sinifId}/ogrenciler/${s.id}`}
                  className="flex min-h-11 items-center rounded-md border px-3 hover:bg-accent"
                >
                  {formatStudentName(s)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <AddStudentForm classId={sinifId} gradeLevels={cls.gradeLevels} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Toplu ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkAddForm classId={sinifId} gradeLevels={cls.gradeLevels} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
