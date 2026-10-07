import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BehaviorWeekView } from "@/components/timeline/behavior-week-view";
import { possessiveName } from "@/lib/student-names";
import { db } from "@/server/db";
import { assertTeacherOfStudent } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getBehaviorWeekForTeacher } from "@/server/services/behavior-week";
import { behaviorWeekQuerySchema } from "@/server/validation/parent";

export const metadata: Metadata = { title: "Davranışlar" };

export default async function StudentBehaviorsPage({
  params,
  searchParams,
}: PageProps<"/ogretmen/siniflar/[sinifId]/ogrenciler/[ogrenciId]/davranislar">) {
  const { sinifId, ogrenciId } = await params;
  const { hafta = 0 } = behaviorWeekQuerySchema.parse(await searchParams);
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfStudent(user, ogrenciId));
  const week = await orNotFound(getBehaviorWeekForTeacher(db, ogrenciId, hafta));
  const { child } = week;
  // The URL's class must be the student's class.
  if (child.classId !== sinifId) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{possessiveName(child.firstName)} davranışları</h1>
        <p className="text-muted-foreground">Okulda ve evde, her davranışın gün gün kaç kez yapıldığı.</p>
      </div>
      <BehaviorWeekView
        week={week}
        baseHref={`/ogretmen/siniflar/${sinifId}/ogrenciler/${child.id}/davranislar`}
        negativeNote="Yalnızca siz ve veli görür."
      />
    </div>
  );
}
