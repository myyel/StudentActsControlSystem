import Link from "next/link";
import { CreateClassForm } from "@/components/classes/create-class-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { listClassesForTeacher } from "@/server/services/class";
import { currentAcademicYear } from "@/server/validation/class";

export default async function TeacherHomePage() {
  // Layouts are not re-rendered on client navigation, so every page checks the role too.
  const { user } = await requirePageRole("teacher");
  const classes = await listClassesForTeacher(db, user.id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sınıflarım</h1>

      {classes.length === 0 ? (
        <p className="text-muted-foreground">Henüz sınıfınız yok. Aşağıdan ilk sınıfınızı oluşturun.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/ogretmen/siniflar/${c.id}`}
                className="block rounded-xl border p-4 transition-colors hover:bg-accent focus-visible:outline-2"
              >
                <p className="text-lg font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.gradeLevel}. sınıf · {c.academicYear} · {c.studentCount} öğrenci
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Yeni sınıf oluştur</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClassForm defaultAcademicYear={currentAcademicYear()} />
        </CardContent>
      </Card>
    </div>
  );
}
