import { and, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { auditLog, user } from "@/server/db/schema";

export type AuditAction =
  | "class.create"
  | "class.update"
  | "class_goal.set"
  | "class_goal.end"
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
  | "student.character_change"
  | "message.create"
  | "message.delete"
  | "deletion.request"
  | "deletion.reject"
  | "student.delete"
  | "user.delete"
  | "data.export";

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
    | "character_type"
    | "message"
    | "deletion_request"
    | "user";
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

export const AUDIT_PAGE = 50;

export type AuditFilters = {
  action?: string;
  /** Matches the actor's name or email (case-insensitive). */
  actor?: string;
  /** Inclusive day range as instants (the page converts school-local days). */
  from?: Date;
  to?: Date;
  page?: number;
};

/** One school's audit trail, newest first. A null actor is a deleted user (or the system). */
export async function listAuditLog(db: Db, schoolId: string, filters: AuditFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pattern = filters.actor ? `%${filters.actor.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      data: auditLog.data,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(
      and(
        eq(auditLog.schoolId, schoolId),
        filters.action ? eq(auditLog.action, filters.action) : undefined,
        pattern ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
        filters.from ? gte(auditLog.createdAt, filters.from) : undefined,
        filters.to ? lt(auditLog.createdAt, filters.to) : undefined,
      ),
    )
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    // One extra row tells whether there is a next page.
    .limit(AUDIT_PAGE + 1)
    .offset((page - 1) * AUDIT_PAGE);
  return { rows: rows.slice(0, AUDIT_PAGE), hasNext: rows.length > AUDIT_PAGE, page };
}
