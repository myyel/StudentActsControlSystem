import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentCharacter } from "@/components/characters/student-character";
import { StudentEditForm } from "@/components/classes/student-edit-form";
import { StudentInvites } from "@/components/invites/student-invites";
import { BackLink } from "@/components/layout/back-link";
import { StudentTimeline } from "@/components/timeline/student-timeline";
import { WeekChart } from "@/components/timeline/week-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { RELATION_LABEL } from "@/lib/relations";
import { cn } from "@/lib/utils";
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
  const query = await searchParams;
  const requested = Number(query.adet);
  const kaynak = query.kaynak === "ev" || query.kaynak === "okul" ? query.kaynak : undefined;
  const source = kaynak === "ev" ? "home" : kaynak === "okul" ? "school" : undefined;
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, TIMELINE_MAX) : TIMELINE_PAGE;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfStudent(user, ogrenciId));

  const [student, character, invites, timeline] = await Promise.all([
    getStudentForTeacher(db, ogrenciId),
    getStudentCharacter(db, ogrenciId),
    listInvitesForStudent(db, ogrenciId),
    getStudentTimeline(db, ogrenciId, limit, source),
  ]);
  // The URL's class must be the student's class.
  if (student.classId !== sinifId) notFound();
  const week = await getLast7Days(db, ogrenciId, student.timeZone);
  const base = `/ogretmen/siniflar/${sinifId}/ogrenciler/${ogrenciId}`;
  const filterHref = (k?: string) => (k ? `${base}?kaynak=${k}` : base);
  const moreHref = `${base}?${new URLSearchParams({ ...(kaynak && { kaynak }), adet: String(limit + TIMELINE_PAGE) })}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="print:hidden">
        <BackLink href={`/ogretmen/siniflar/${sinifId}`}>{student.className}</BackLink>
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
          <nav aria-label="Kaynak" className="flex flex-wrap gap-2">
            {(
              [
                [undefined, "Tümü"],
                ["okul", "Okul"],
                ["ev", "Ev"],
              ] as const
            ).map(([k, label]) => {
              const current = k === kaynak;
              return (
                <Link
                  key={label}
                  href={filterHref(k)}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-md border px-4 text-sm font-medium",
                    current ? "border-primary bg-primary/10" : "hover:bg-accent",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <StudentTimeline items={timeline.items} timeZone={student.timeZone} />
          {timeline.hasMore && limit < TIMELINE_MAX && (
            <Link
              href={moreHref}
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
          {student.parents.length > 0 && (
            <Link
              href={`/ogretmen/siniflar/${sinifId}/mesajlar?ogrenci=${student.id}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Velilere mesaj gönder
            </Link>
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
