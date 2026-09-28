import { CharacterTypeEditor } from "@/components/characters/character-type-editor";
import { LevelThresholdsForm } from "@/components/characters/level-thresholds-form";
import { BackLink } from "@/components/layout/back-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { getLevelThresholds, listCharacterTypes } from "@/server/services/character";

export default async function AdminCharactersPage() {
  const { user } = await requirePageRole("admin");
  if (!user.schoolId) {
    return <p className="text-muted-foreground">Hesabınız bir okula bağlı değil.</p>;
  }

  const [thresholds, types] = await Promise.all([
    getLevelThresholds(db, user.schoolId),
    listCharacterTypes(db, user.schoolId),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink href="/admin">Yönetim paneli</BackLink>
        <h1 className="text-2xl font-semibold">Karakterler</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seviye eşikleri</CardTitle>
          <CardDescription>Bir karakterin o seviyeye ulaşması için gereken XP (gelişim puanı).</CardDescription>
        </CardHeader>
        <CardContent>
          <LevelThresholdsForm thresholds={thresholds} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Karakter türleri</h2>
          <p className="text-sm text-muted-foreground">
            Pasif türler yeni seçimlerde görünmez; o türü kullanan öğrencilerin karakteri değişmez.
          </p>
        </div>
        {types.map((type) => (
          <CharacterTypeEditor key={type.id} type={type} />
        ))}
      </section>
    </div>
  );
}
