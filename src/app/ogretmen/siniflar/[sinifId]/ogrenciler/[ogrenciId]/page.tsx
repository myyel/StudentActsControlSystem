import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentCharacter } from "@/components/characters/student-character";
import { StudentEditForm } from "@/components/classes/student-edit-form";
import { StudentInvites } from "@/components/invites/student-invites";
import { StudentTimeline } from "@/components/timeline/student-timeline";
import { WeekChart } from "@/components/timeline/week-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { RELATION_LABEL } from "@/lib/relations";
import { db } from "@/server/db";
import { assertTeacherOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getStudentCharacter } from "@/server/services/character";
import { listInvitesForStudent } from "@/server/services/invite";
import { getStudentForTeacher } from "@/server/services/student";
import { getLast7Days, getStudentTimeline, TIMELINE_MAX, TIMELINE_PAGE } from "@/server/services/timeline";

export default async function StudentPage({
  params,
  searchParams,
}: PageProps<"/ogretmen/siniflar/[sinifId]/ogrenciler/[ogrenciId]">) {
  const { sinifId, ogrenciId } = await params;
  const requested = Number((await searchParams).adet);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, TIMELINE_MAX) : TIMELINE_PAGE;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfStudent(user, ogrenciId));

  const [student, character, invites, timeline] = await Promise.all([
    getStudentForTeacher(db, ogrenciId),
    getStudentCharacter(db, ogrenciId),
    listInvitesForStudent(db, ogrenciId),
    getStudentTimeline(db, ogrenciId, limit),
  ]);
  // The URL's class must be the student's class.
  if (student.classId !== sinifId) notFound();
  const week = await getLast7Days(db, ogrenciId, student.timeZone);
  const base = `/ogretmen/siniflar/${sinifId}/ogrenciler/${ogrenciId}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="print:hidden">
        <Link href={`/ogretmen/siniflar/${sinifId}`} className="text-sm text-muted-foreground hover:underline">
          ← {student.className}
        </Link>
        <h1 className="text-2xl font-semibold">{formatStudentName(student)}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 print:hidden">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Gelişim puanı (XP)</p>
          <p className="text-3xl font-semibold">{student.xp}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Davranış dengesi</p>
          <p className="text-3xl font-semibold">{student.balance > 0 ? `+${student.balance}` : student.balance}</p>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Karakter</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentCharacter studentId={student.id} character={character} />
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Son 7 gün</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekChart days={week} />
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Zaman çizelgesi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <StudentTimeline items={timeline.items} timeZone={student.timeZone} />
          {timeline.hasMore && limit < TIMELINE_MAX && (
            <Link
              href={`${base}?adet=${limit + TIMELINE_PAGE}`}
              scroll={false}
              className={buttonVariants({ variant: "outline", className: "h-11 self-start" })}
            >
              Daha fazla
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="print:hidden">
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

      <Card className="print:hidden">
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

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle>Veli davet kodu</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentInvites studentId={student.id} studentName={formatStudentName(student)} invites={invites} />
        </CardContent>
      </Card>
    </div>
  );
}
