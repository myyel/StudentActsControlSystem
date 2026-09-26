import { z } from "@/lib/zod";
import { progressStatus } from "@/server/db/schema";

const status = z.enum(progressStatus.enumValues);

export const setProgressSchema = z
  .object({
    studentId: z.uuid(),
    stageId: z.uuid(),
    status,
    stars: z.number().int().min(0).max(3).nullable().optional(),
  })
  .refine((v) => v.stars == null || v.status === "completed", {
    message: "Yıldız yalnızca tamamlanan duraklara verilebilir.",
    path: ["stars"],
  });

export const bulkSetProgressSchema = z.object({
  stageId: z.uuid(),
  studentIds: z.union([z.literal("all"), z.array(z.uuid()).min(1).max(60)]),
  status,
});

export type SetProgressInput = z.infer<typeof setProgressSchema>;
export type BulkSetProgressInput = z.infer<typeof bulkSetProgressSchema>;
