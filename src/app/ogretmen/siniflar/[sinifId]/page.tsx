import Link from "next/link";
import { AddStudentForm } from "@/components/classes/add-student-form";
import { BulkAddForm } from "@/components/classes/bulk-add-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";
import { listStudentsForClass } from "@/server/services/student";

export default async function ClassPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students] = await Promise.all([getClass(db, sinifId), listStudentsForClass(db, sinifId)]);
  const withoutParent = students.filter((s) => s.active && s.parentCount === 0).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/ogretmen" className="text-sm text-muted-foreground hover:underline">
            ← Sınıflarım
          </Link>
          <h1 className="text-2xl font-semibold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground">
            {cls.gradeLevel}. sınıf · {cls.academicYear} · {students.length} öğrenci
            {withoutParent > 0 && ` · ${withoutParent} öğrencinin velisi henüz bağlanmadı`}
          </p>
        </div>
        {students.length > 0 && (
          <Link href={`/ogretmen/siniflar/${sinifId}/davetler`} className={buttonVariants({ className: "h-11" })}>
            Veli davet kartları
          </Link>
        )}
      </div>

      {students.length === 0 ? (
        <p className="text-muted-foreground">Bu sınıfta henüz öğrenci yok. Aşağıdan ekleyebilirsiniz.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ogretmen/siniflar/${sinifId}/ogrenciler/${s.id}`}
                className="flex min-h-20 flex-col justify-between gap-2 rounded-xl border p-3 transition-colors hover:bg-accent"
              >
                <span className="font-medium">{formatStudentName(s)}</span>
                <span className="flex flex-wrap gap-1">
                  {!s.active && <Badge variant="secondary">Pasif</Badge>}
                  {s.parentCount > 0 ? (
                    <Badge variant="outline">{s.parentCount} veli</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Veli yok
                    </Badge>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
