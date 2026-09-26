import { ClassNav } from "@/components/classes/class-nav";
import { ClassInvites } from "@/components/invites/class-invites";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";

export default async function ClassInvitesPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]/davetler">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));
  const cls = await getClass(db, sinifId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="davetler" />
      <div className="print:hidden">
        <p className="text-muted-foreground">
          Her öğrenci için bir davet kartı üretilir. Kartları yazdırıp velilere dağıtabilirsiniz; veli QR&apos;ı
          okutarak veya kodu girerek kayıt olur.
        </p>
      </div>
      <ClassInvites classId={sinifId} />
    </div>
  );
}
