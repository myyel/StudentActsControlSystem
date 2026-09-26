import type { DbOrTx } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export type AuditAction =
  | "class.create"
  | "student.create"
  | "student.update"
  | "invite.create"
  | "invite.revoke"
  | "parent.link";

export type AuditEntry = {
  action: AuditAction;
  entity: "class" | "student" | "invite_code" | "parent_student";
  entityId: string;
  actorId?: string | null;
  schoolId?: string | null;
  data?: Record<string, unknown>;
  ip?: string | null;
};

export async function writeAudit(db: DbOrTx, entry: AuditEntry) {
  await db.insert(auditLog).values({
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    actorId: entry.actorId ?? null,
    schoolId: entry.schoolId ?? null,
    data: entry.data ?? {},
    ip: entry.ip ?? null,
  });
}
