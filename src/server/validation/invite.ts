import { z } from "@/lib/zod";
import type { InviteOptions } from "@/server/services/invite";

/** From the form: an unchecked "singleUse" checkbox is simply absent. */
export const inviteOptionsSchema = z
  .object({
    singleUse: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    validity: z.enum(["7", "14", "30", "none"], { message: "Geçerlilik süresini seçin." }).default("14"),
  })
  .transform(
    ({ singleUse, validity }): InviteOptions => ({
      singleUse,
      validDays: validity === "none" ? null : Number(validity),
    }),
  );

export const classInviteSchema = z.object({
  onlyWithoutParent: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
