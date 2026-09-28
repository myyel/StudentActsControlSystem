import { z } from "@/lib/zod";

export const DELETION_NOTE_MAX = 500;

export const deletionRequestSchema = z.object({
  note: z
    .string()
    .trim()
    .max(DELETION_NOTE_MAX, `Not en fazla ${DELETION_NOTE_MAX} karakter olabilir.`)
    .optional()
    .transform((v) => v || null),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Şifrenizi girin."),
  requestDeletionOf: z.array(z.uuid()).max(20).default([]),
});

export const completeDeletionSchema = z.object({
  // The admin types the child's first name to confirm an irreversible delete.
  confirmName: z.string().trim().min(1, "Onaylamak için öğrencinin adını yazın."),
});

export const rejectDeletionSchema = z.object({
  reason: z.string().trim().min(3, "Reddetme gerekçesini yazın.").max(500, "Gerekçe en fazla 500 karakter olabilir."),
});

/** /admin/denetim query string. Invalid values are dropped, not errors (it is a filter form). */
export const auditFilterSchema = z.object({
  islem: z.string().max(64).optional().catch(undefined),
  kisi: z.string().trim().max(100).optional().catch(undefined),
  baslangic: z.iso.date().optional().catch(undefined),
  bitis: z.iso.date().optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

export const exportFormatSchema = z.enum(["json", "csv"]);
