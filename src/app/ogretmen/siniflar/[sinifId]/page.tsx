import Link from "next/link";
import { AddStudentForm } from "@/components/classes/add-student-form";
import { BulkAddForm } from "@/components/classes/bulk-add-form";
import { ClassNav } from "@/components/classes/class-nav";
import { ScoringBoard } from "@/components/scoring/scoring-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { listBehaviorTypes } from "@/server/services/behavior-type";
import { getClass } from "@/server/services/class";
import { listStudentsForClass } from "@/server/services/student";

export default async function ClassPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students, behaviors] = await Promise.all([
    getClass(db, sinifId),
    listStudentsForClass(db, sinifId),
    listBehaviorTypes(db, sinifId, { scope: "school", activeOnly: true }),
  ]);
  const active = students.filter((s) => s.active);
  const inactive = students.filter((s) => !s.active);
  const withoutParent = active.filter((s) => s.parentCount === 0).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="puanlama" />
      <p className="-mt-3 text-sm text-muted-foreground">
        {cls.gradeLevel}. sınıf · {cls.academicYear} · {active.length} öğrenci
        {withoutParent > 0 && ` · ${withoutParent} öğrencinin velisi henüz bağlanmadı`}
      </p>

      <ScoringBoard
        classId={sinifId}
        students={active.map(({ id, firstName, lastInitial, xp }) => ({ id, firstName, lastInitial, xp }))}
        behaviors={behaviors.map(({ id, name, icon, points }) => ({ id, name, icon, points }))}
      />

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
            <AddStudentForm classId={sinifId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Toplu ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <BulkAddForm classId={sinifId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
