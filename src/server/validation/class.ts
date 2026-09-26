import { z } from "@/lib/zod";

export const academicYearSchema = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "Öğretim yılı 2026-2027 biçiminde olmalı.")
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, "Öğretim yılı ardışık iki yıl olmalı.");

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Sınıf adını girin.").max(40, "Sınıf adı en fazla 40 karakter olabilir."),
  gradeLevel: z.coerce.number().int().min(1, "Sınıf düzeyi 1–4 olmalı.").max(4, "Sınıf düzeyi 1–4 olmalı."),
  academicYear: academicYearSchema,
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

/** September starts a new school year. */
export function currentAcademicYear(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
