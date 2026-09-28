import type { Metadata } from "next";
import { ClassNav } from "@/components/classes/class-nav";
import { ClassMessageList } from "@/components/messages/class-message-list";
import { MessageComposer } from "@/components/messages/message-composer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";
import { listClassMessages } from "@/server/services/message";
import { listStudentsForClass } from "@/server/services/student";

export const metadata: Metadata = { title: "Mesajlar" };

export default async function ClassMessagesPage({ params, searchParams }: PageProps<"/ogretmen/siniflar/[sinifId]/mesajlar">) {
  const { sinifId } = await params;
  const { ogrenci } = await searchParams;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, students, messages] = await Promise.all([
    getClass(db, sinifId),
    listStudentsForClass(db, sinifId),
    listClassMessages(db, sinifId),
  ]);
  const options = students.map((s) => ({ id: s.id, name: formatStudentName(s), parentCount: s.parentCount }));
  // ?ogrenci= from the student page preselects that student.
  const preselected = typeof ogrenci === "string" && options.some((s) => s.id === ogrenci) ? ogrenci : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="mesajlar" />

      <Card>
        <CardHeader>
          <CardTitle>Yeni mesaj</CardTitle>
          <CardDescription>
            Duyuru sınıftaki tüm velilere, öğrenciye özel mesaj yalnızca o öğrencinin velilerine gider. Sonradan bağlanan
            veliler de eski mesajları görür. Veliler yanıt yazamaz, hızlı tepki verebilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MessageComposer classId={sinifId} students={options} defaultStudentId={preselected} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Gönderilenler</h2>
        <ClassMessageList items={messages} />
      </section>
    </div>
  );
}
