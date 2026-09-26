import { KVKK_DOC_VERSION } from "@/content/kvkk";
import type { DbOrTx } from "@/server/db";
import { consentRecord } from "@/server/db/schema";

export type ConsentContext = { ip?: string | null; userAgent?: string | null };

/** Records both the privacy notice acknowledgement and explicit consent for one child. */
export async function recordConsents(
  db: DbOrTx,
  userId: string,
  studentId: string,
  ctx: ConsentContext,
) {
  const base = {
    userId,
    studentId,
    docVersion: KVKK_DOC_VERSION,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  };
  await db.insert(consentRecord).values([
    { ...base, kind: "privacy_notice" as const },
    { ...base, kind: "explicit_consent" as const },
  ]);
}
