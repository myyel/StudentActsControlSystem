import { asc } from "drizzle-orm";
import { CHARACTER_TEMPLATES, stageAssetUrl } from "@/content/characters";
import type { DbOrTx } from "@/server/db";
import { characterStage, characterType, school } from "@/server/db/schema";

/**
 * A new school with the original character types and their stages (students need a type).
 * Level thresholds are left to the defaults (src/lib/character.ts) until an admin sets them.
 */
export async function createSchool(db: DbOrTx, name: string) {
  const [created] = await db.insert(school).values({ name }).returning();
  const types = await db
    .insert(characterType)
    .values(CHARACTER_TEMPLATES.map((t, i) => ({ schoolId: created!.id, name: t.name, sortOrder: i + 1 })))
    .returning();
  await db.insert(characterStage).values(
    CHARACTER_TEMPLATES.flatMap((t, i) =>
      t.stages.map((stageName, j) => ({
        characterTypeId: types[i]!.id,
        level: j + 1,
        name: stageName,
        assetUrl: stageAssetUrl(t.slug, j + 1),
      })),
    ),
  );
  return { school: created!, characterTypeIds: types.map((t) => t.id) };
}

export async function listSchools(db: DbOrTx) {
  return db.select({ id: school.id, name: school.name }).from(school).orderBy(asc(school.createdAt));
}
