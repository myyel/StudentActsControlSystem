import { z } from "@/lib/zod";
import { parentRelation } from "@/server/db/schema";

const checked = (message: string) =>
  z.preprocess((v) => v === "on" || v === "true" || v === true, z.literal(true, { message }));

const consentFields = {
  privacyNotice: checked("Devam etmek için aydınlatma metnini okuduğunuzu onaylayın."),
  explicitConsent: checked("Devam etmek için açık rıza vermeniz gerekiyor."),
};

const relation = z.enum(parentRelation.enumValues, { message: "Çocuğunuzla yakınlığınızı seçin." });
const code = z.string().trim().min(1, "Davet kodunu girin.");

export const registerParentSchema = z.object({
  code,
  name: z.string().trim().min(2, "Adınızı ve soyadınızı girin.").max(80, "Ad en fazla 80 karakter olabilir."),
  email: z
    .email("Geçerli bir e-posta adresi girin.")
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı.")
    .max(128, "Şifre en fazla 128 karakter olabilir."),
  relation,
  ...consentFields,
});

export const linkChildSchema = z.object({ code, relation, ...consentFields });

export type RegisterParentInput = z.infer<typeof registerParentSchema>;

/** `?hafta=N` on the parent's behavior page: N weeks back; anything invalid falls back to this week. */
export const behaviorWeekQuerySchema = z.object({
  hafta: z.coerce.number().int().min(0).max(52).optional().catch(undefined),
});
