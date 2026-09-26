import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentEditForm } from "@/components/classes/student-edit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { RELATION_LABEL } from "@/lib/relations";
import { db } from "@/server/db";
import { assertTeacherOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getStudentForTeacher } from "@/server/services/student";

export default async function StudentPage({
  params,
}: PageProps<"/ogretmen/siniflar/[sinifId]/ogrenciler/[ogrenciId]">) {
  const { sinifId, ogrenciId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfStudent(user, ogrenciId));

  const student = await getStudentForTeacher(db, ogrenciId);
  // The URL's class must be the student's class.
  if (student.classId !== sinifId) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/ogretmen/siniflar/${sinifId}`} className="text-sm text-muted-foreground hover:underline">
          ← {student.className}
        </Link>
        <h1 className="text-2xl font-semibold">{formatStudentName(student)}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bilgiler</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentEditForm
            studentId={student.id}
            firstName={student.firstName}
            lastInitial={student.lastInitial}
            active={student.active}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bağlı veliler</CardTitle>
        </CardHeader>
        <CardContent>
          {student.parents.length === 0 ? (
            <p className="text-muted-foreground">Henüz bağlı veli yok. Aşağıdan davet kodu üretebilirsiniz.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {student.parents.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {p.name} <span className="text-muted-foreground">({RELATION_LABEL[p.relation]})</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{p.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
