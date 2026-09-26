import { ClassNav } from "@/components/classes/class-nav";
import { ArchivedList } from "@/components/curriculum/archived-list";
import { CurriculumEditor } from "@/components/curriculum/curriculum-editor";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import { getClass } from "@/server/services/class";
import { getArchivedNodes, getCurriculum } from "@/server/services/curriculum";

export default async function CurriculumPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]/duraklar">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, subjects, archived] = await Promise.all([
    getClass(db, sinifId),
    getCurriculum(db, sinifId),
    getArchivedNodes(db, sinifId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="duraklar" />
      <p className="text-sm text-muted-foreground">
        Ders → Konu → Durak. Sıralamak için tutamaçtan sürükleyin (klavyede: boşluk ve ok tuşları). Arşivlenen öğeler
        matriste ve veli ekranında görünmez; öğrencilerin ilerlemesi silinmez.
      </p>
      <CurriculumEditor classId={sinifId} subjects={subjects} />
      {archived.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Arşivlenenler ({archived.length})
          </summary>
          <ArchivedList nodes={archived} />
        </details>
      )}
    </div>
  );
}
