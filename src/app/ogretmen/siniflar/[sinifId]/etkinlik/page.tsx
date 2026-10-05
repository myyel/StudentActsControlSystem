import { ActivityScheduleForm } from "@/components/classes/activity-schedule-form";
import { ClassNav } from "@/components/classes/class-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";
import { getClassActivities } from "@/server/services/class-activity";

export default async function ClassActivityPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]/etkinlik">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, { activities }] = await Promise.all([getClass(db, sinifId), getClassActivities(db, sinifId)]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="etkinlik" />
      <Card>
        <CardHeader>
          <CardTitle>Etkinlik saati</CardTitle>
          <CardDescription>Her gün için bir etkinlik saati seçin; program her hafta tekrar eder.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityScheduleForm classId={sinifId} activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
