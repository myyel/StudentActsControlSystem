import { ClassCharacterTypesForm } from "@/components/characters/class-character-types-form";
import { ClassLevelsForm } from "@/components/characters/class-levels-form";
import { ClassNav } from "@/components/classes/class-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { orNotFound, requirePageRole } from "@/server/auth/session";
import {
  countClassStudents,
  getClassCharacterTypes,
  getClassLevelSettings,
  getLevelThresholds,
} from "@/server/services/character";
import { getClass } from "@/server/services/class";

export default async function ClassCharactersPage({ params }: PageProps<"/ogretmen/siniflar/[sinifId]/karakterler">) {
  const { sinifId } = await params;
  const { user } = await requirePageRole("teacher");
  await orNotFound(assertTeacherOfClass(user, sinifId));

  const [cls, levels, types, counts] = await Promise.all([
    getClass(db, sinifId),
    getClassLevelSettings(db, sinifId),
    getClassCharacterTypes(db, sinifId),
    countClassStudents(db, sinifId),
  ]);
  const schoolThresholds = await getLevelThresholds(db, levels.schoolId);
  const firstOffered = types.types.find((t) => t.selected);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <ClassNav classId={sinifId} className={cls.name} active="karakterler" />

      <Card>
        <CardHeader>
          <CardTitle>Karakter türleri</CardTitle>
          <CardDescription>
            {types.custom
              ? "Bu sınıf için seçtiğiniz türler ve sıraları."
              : "Bu sınıf okulun tüm aktif türlerini okulun sırasıyla kullanıyor."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassCharacterTypesForm
            classId={sinifId}
            custom={types.custom}
            maxLevel={levels.thresholds.length}
            types={types.types.map(({ id, name, selected, stages, schoolStageNames, classStageNames }) => ({
              id,
              name,
              selected,
              stages,
              schoolStageNames,
              classStageNames,
            }))}
            studentsByType={counts.byType}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seviyeler</CardTitle>
          <CardDescription>
            {levels.custom
              ? `Bu sınıfın kendi ayarı: ${levels.thresholds.length} seviye.`
              : "Bu sınıf okulun seviye ayarını kullanıyor."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassLevelsForm
            classId={sinifId}
            thresholds={levels.thresholds}
            custom={levels.custom}
            schoolThresholds={schoolThresholds}
            exampleStages={firstOffered?.stages.map((s) => s.name) ?? []}
            studentsByLevel={counts.byLevel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
