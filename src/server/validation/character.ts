import { z } from "@/lib/zod";
import { MAX_LEVEL } from "@/lib/character";

export const levelThresholdsSchema = z.object({
  thresholds: z
    .array(
      z.coerce
        .number({ message: "Eşiği girin." })
        .int("Eşik tam sayı olmalı.")
        .min(0, "Eşik negatif olamaz.")
        .max(100_000, "Eşik en fazla 100.000 olabilir."),
    )
    .length(MAX_LEVEL, `${MAX_LEVEL} seviyenin de eşiğini girin.`)
    .refine((t) => t[0] === 0, "1. seviyenin eşiği 0 olmalı.")
    .refine((t) => t.every((v, i) => i === 0 || v > t[i - 1]!), "Her seviyenin eşiği bir öncekinden büyük olmalı."),
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
