import { z } from "@/lib/zod";

export const academicYearSchema = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "Öğretim yılı 2026-2027 biçiminde olmalı.")
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, "Öğretim yılı ardışık iki yıl olmalı.");

export const gradeLevelSchema = z.coerce
  .number({ message: "Sınıf düzeyini seçin." })
  .int("Sınıf düzeyi 1–4 olmalı.")
  .min(1, "Sınıf düzeyi 1–4 olmalı.")
  .max(4, "Sınıf düzeyi 1–4 olmalı.");

/** A single-level class has one level; a combined (birleştirilmiş) class at least two. Sorted, distinct. */
export const createClassSchema = z
  .object({
    name: z.string().trim().min(1, "Sınıf adını girin.").max(40, "Sınıf adı en fazla 40 karakter olabilir."),
    combined: z.boolean(),
    gradeLevels: z.array(gradeLevelSchema).min(1, "Sınıf düzeyini seçin."),
    academicYear: academicYearSchema,
  })
  .transform(({ combined, gradeLevels, ...rest }, ctx) => {
    const levels = [...new Set(gradeLevels)].sort((a, b) => a - b);
    if (combined ? levels.length < 2 : levels.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["gradeLevels"],
        message: combined ? "Birleştirilmiş sınıf için en az iki düzey seçin." : "Bir sınıf düzeyi seçin.",
      });
      return z.NEVER;
    }
    return { ...rest, gradeLevels: levels };
  });

export type CreateClassInput = z.output<typeof createClassSchema>;

/** September starts a new school year. */
export function currentAcademicYear(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export const MAX_HOME_DAILY_XP_CAP = 50;

export const homeDailyXpCapSchema = z.object({
  homeDailyXpCap: z.coerce
    .number({ message: "Tavanı girin." })
    .int("Tavan tam sayı olmalı.")
    .min(0, "Tavan negatif olamaz.")
    .max(MAX_HOME_DAILY_XP_CAP, `Tavan en fazla ${MAX_HOME_DAILY_XP_CAP} olabilir.`),
});

export const classGoalSchema = z.object({
  title: z.string().trim().min(1, "Hedefin adını girin (ör. Bahçe oyunu).").max(60, "Hedef adı en fazla 60 karakter olabilir."),
  target: z.coerce
    .number({ message: "Kaç yıldız gerektiğini girin." })
    .int("Yıldız sayısı tam sayı olmalı.")
    .min(5, "Hedef en az 5 yıldız olmalı.")
    .max(1000, "Hedef en fazla 1000 yıldız olabilir."),
});

export type ClassGoalInput = z.infer<typeof classGoalSchema>;
