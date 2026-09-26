import { z } from "@/lib/zod";
import { MAX_BULK_STUDENTS, MAX_FIRST_NAME_LENGTH, parseStudentLines } from "@/lib/student-names";

export const studentNameSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Öğrencinin adını girin.")
    .max(MAX_FIRST_NAME_LENGTH, `Ad en fazla ${MAX_FIRST_NAME_LENGTH} karakter olabilir.`),
  lastInitial: z
    .string()
    .trim()
    .max(1, "Soyad için yalnızca baş harf girin.")
    .regex(/^\p{L}?$/u, "Soyad baş harfi bir harf olmalı.")
    .transform((v) => (v ? v.toLocaleUpperCase("tr") : null)),
});

/** Bulk paste: every line must parse; the teacher fixes errors from the preview before saving. */
export const bulkStudentsSchema = z
  .string()
  .transform((text, ctx) => {
    const lines = parseStudentLines(text);
    const invalid = lines.find((l) => !l.ok);
    if (invalid && !invalid.ok) {
      ctx.addIssue({ code: "custom", message: `${invalid.line}. satır: ${invalid.error}` });
      return z.NEVER;
    }
    const names = lines.flatMap((l) => (l.ok ? [l.value] : []));
    if (names.length === 0) {
      ctx.addIssue({ code: "custom", message: "En az bir öğrenci adı girin." });
      return z.NEVER;
    }
    if (names.length > MAX_BULK_STUDENTS) {
      ctx.addIssue({ code: "custom", message: `Tek seferde en fazla ${MAX_BULK_STUDENTS} öğrenci eklenebilir.` });
      return z.NEVER;
    }
    return names;
  });
