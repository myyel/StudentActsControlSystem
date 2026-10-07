import { AdminPageHeader, AdminSectionTitle } from "@/components/admin/admin-page-header";
import { ADMIN_SECTIONS, adminCardClass } from "@/components/admin/admin-sections";
import { CharacterTypeEditor } from "@/components/characters/character-type-editor";
import { LevelThresholdsForm } from "@/components/characters/level-thresholds-form";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { getSchoolLevelSettings, listCharacterTypes } from "@/server/services/character";

export default async function AdminCharactersPage() {
  const { user } = await requirePageRole("admin");
  if (!user.schoolId) {
    return <p className="text-muted-foreground">Hesabınız bir okula bağlı değil.</p>;
  }

  const [{ thresholds, completeXp }, types] = await Promise.all([
    getSchoolLevelSettings(db, user.schoolId),
    listCharacterTypes(db, user.schoolId),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminPageHeader section={ADMIN_SECTIONS.characters}>
        Karakterlerin seviye atlaması için gereken XP ve okulda kullanılan karakter türleri.
      </AdminPageHeader>

      <section className={cn(adminCardClass, "flex flex-col gap-4 p-4 sm:p-6")}>
        <AdminSectionTitle title="Seviye eşikleri">
          Bir karakterin o seviyeye ulaşması için gereken XP (gelişim puanı).
        </AdminSectionTitle>
        <LevelThresholdsForm thresholds={thresholds} completeXp={completeXp} />
      </section>

      <section className="flex flex-col gap-4">
        <AdminSectionTitle title="Karakter türleri">
          Pasif türler yeni seçimlerde görünmez; o türü kullanan öğrencilerin karakteri değişmez.
        </AdminSectionTitle>
        <div className="flex flex-col gap-5">
          {types.map((type) => (
            <CharacterTypeEditor key={type.id} type={type} />
          ))}
        </div>
      </section>
    </div>
  );
}
