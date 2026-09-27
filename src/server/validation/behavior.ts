import { z } from "@/lib/zod";
import { MAX_POINTS, MIN_POINTS } from "@/lib/behavior";
import { behaviorScope } from "@/server/db/schema";

export const behaviorTypeSchema = z
  .object({
    name: z.string().trim().min(1, "Davranışın adını girin.").max(40, "Ad en fazla 40 karakter olabilir."),
    icon: z.string().trim().min(1, "Bir simge seçin.").max(16, "Simge çok uzun."),
    points: z.coerce
      .number({ message: "Puanı girin." })
      .int("Puan tam sayı olmalı.")
      .min(MIN_POINTS, `Puan en az ${MIN_POINTS} olabilir.`)
      .max(MAX_POINTS, `Puan en fazla +${MAX_POINTS} olabilir.`)
      .refine((p) => p !== 0, "Puan 0 olamaz."),
    scope: z.enum(behaviorScope.enumValues, { message: "Kapsamı seçin." }),
  })
  .refine((v) => v.scope !== "home" || v.points > 0, {
    message: "Ev davranışları yalnızca olumlu puanlı olabilir.",
    path: ["points"],
  });

export type BehaviorTypeInput = z.infer<typeof behaviorTypeSchema>;

export const giveBehaviorSchema = z.object({
  studentIds: z
    .array(z.uuid())
    .min(1, "En az bir öğrenci seçin.")
    .max(60, "Tek seferde en fazla 60 öğrenciye puan verilebilir.")
    .transform((ids) => [...new Set(ids)]),
  behaviorTypeId: z.uuid(),
  note: z
    .string()
    .trim()
    .max(200, "Not en fazla 200 karakter olabilir.")
    .optional()
    .transform((v) => v || null),
  batchId: z.uuid(),
});

export type GiveBehaviorInput = z.infer<typeof giveBehaviorSchema>;

export const giveHomeBehaviorSchema = z.object({
  behaviorTypeId: z.uuid(),
  batchId: z.uuid(),
});

export type GiveHomeBehaviorInput = z.infer<typeof giveHomeBehaviorSchema>;
