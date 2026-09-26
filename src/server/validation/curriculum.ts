import { z } from "@/lib/zod";

export const nodeKindSchema = z.enum(["subject", "topic", "stage"]);

const LIMIT = { subject: 60, topic: 80, stage: 80 } as const;
const LABEL = { subject: "Ders", topic: "Konu", stage: "Durak" } as const;

export const nodeNameSchema = (kind: z.infer<typeof nodeKindSchema>) =>
  z
    .string()
    .trim()
    .min(1, `${LABEL[kind]} adını girin.`)
    .max(LIMIT[kind], `${LABEL[kind]} adı en fazla ${LIMIT[kind]} karakter olabilir.`);

export const reorderSchema = z.array(z.uuid()).min(1).max(200);
