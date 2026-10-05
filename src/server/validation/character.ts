import { z } from "@/lib/zod";
import { MAX_LEVEL, MIN_CLASS_LEVELS } from "@/lib/character";

const thresholdField = z.coerce
  .number({ message: "Eşiği girin." })
  .int("Eşik tam sayı olmalı.")
  .min(0, "Eşik negatif olamaz.")
  .max(100_000, "Eşik en fazla 100.000 olabilir.");

const ascending = (t: z.ZodArray<typeof thresholdField>) =>
  t
    .refine((v) => v[0] === 0, "1. seviyenin eşiği 0 olmalı.")
    .refine((v) => v.every((x, i) => i === 0 || x > v[i - 1]!), "Her seviyenin eşiği bir öncekinden büyük olmalı.");

/** School thresholds (admin): always all five levels. */
export const levelThresholdsSchema = z.object({
  thresholds: ascending(z.array(thresholdField).length(MAX_LEVEL, `${MAX_LEVEL} seviyenin de eşiğini girin.`)),
});

/** A class's own levels (teacher): 2–5 levels, each type uses its first stages. */
export const classLevelsSchema = z.object({
  thresholds: ascending(
    z
      .array(thresholdField)
      .min(MIN_CLASS_LEVELS, `En az ${MIN_CLASS_LEVELS} seviye olmalı.`)
      .max(MAX_LEVEL, `En fazla ${MAX_LEVEL} seviye olabilir.`),
  ),
});

export const classCharacterTypesSchema = z.object({
  typeIds: z.array(z.uuid("Bir karakter seçin.")).min(1, "En az bir karakter türü seçin.").max(50),
});

export type LevelThresholdsInput = z.infer<typeof levelThresholdsSchema>;

const nameField = (label: string) =>
  z.string().trim().min(1, `${label} girin.`).max(40, `${label} en fazla 40 karakter olabilir.`);

export const characterTypeSchema = z.object({
  name: nameField("Türün adını"),
  active: z.boolean(),
  stageNames: z.array(nameField("Aşamanın adını")).length(MAX_LEVEL),
});

export type CharacterTypeInput = z.infer<typeof characterTypeSchema>;

export const studentCharacterSchema = z.object({ characterTypeId: z.uuid("Bir karakter seçin.") });
