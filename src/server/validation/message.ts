import { z } from "@/lib/zod";
import { MESSAGE_BODY_MAX, MESSAGE_TITLE_MAX } from "@/lib/messages";
import { messageReaction } from "@/server/db/schema";

export const messageSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Başlık girin.")
    .max(MESSAGE_TITLE_MAX, `Başlık en fazla ${MESSAGE_TITLE_MAX} karakter olabilir.`),
  body: z
    .string()
    .trim()
    .min(1, "Mesajı yazın.")
    .max(MESSAGE_BODY_MAX, `Mesaj en fazla ${MESSAGE_BODY_MAX} karakter olabilir.`),
  // Empty = class announcement.
  studentId: z
    .union([z.uuid({ message: "Öğrenciyi seçin." }), z.literal("")])
    .optional()
    .transform((v) => v || null),
});

export type MessageInput = z.infer<typeof messageSchema>;

export const reactionSchema = z.enum(messageReaction.enumValues).nullable();
