import type { DbOrTx } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export type AuditAction =
  | "class.create"
  | "class.update"
  | "student.create"
  | "student.update"
  | "invite.create"
  | "invite.revoke"
  | "parent.link"
  | "behavior_type.create"
  | "behavior_type.update"
  | "behavior.give"
  | "behavior.give_home"
  | "behavior.undo"
  | "behavior.delete"
  | "curriculum.create"
  | "curriculum.update"
  | "curriculum.archive"
  | "curriculum.restore"
  | "curriculum.reorder"
  | "progress.set"
  | "progress.bulk_set"
  | "character.thresholds_update"
  | "character_type.update"
  | "student.character_change";

export type AuditEntry = {
  action: AuditAction;
  entity:
    | "class"
    | "student"
    | "invite_code"
    | "parent_student"
    | "behavior_type"
    | "behavior_event"
    | "subject"
    | "topic"
    | "stage"
    | "student_progress"
    | "school"
    | "character_type";
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
