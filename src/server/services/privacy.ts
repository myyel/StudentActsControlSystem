import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "@/server/db";
import {
  auditLog,
  consentRecord,
  deletionRequest,
  notification,
  parentStudent,
  schoolClass,
  student,
  user,
  type DeletionRequestStatus,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import { writeAudit } from "./audit";

// KVKK deletion (phase 9 decisions): a parent asks for a child's data to be deleted and a school
// admin carries it out; deletion is a hard delete. Audit rows stay but lose personal fields.
// A parent can delete their own account at once; consent records outlive it without the link.

/** Audit `data` keys that can hold a child's personal data (names, message titles, notes). */
const PERSONAL_AUDIT_KEYS = ["firstName", "lastInitial", "name", "title", "body", "note"];

/** Removes personal fields from every audit row about the student; ids and actions stay. */
export async function scrubAuditForStudent(tx: Tx, studentId: string) {
  await tx
    .update(auditLog)
    .set({ data: sql`${auditLog.data} - ${sql.raw(`array[${PERSONAL_AUDIT_KEYS.map((k) => `'${k}'`).join(",")}]`)}::text[]` })
    .where(
      sql`(${auditLog.entity} = 'student' and ${auditLog.entityId} = ${studentId})
        or (${auditLog.entity} = 'parent_student' and ${auditLog.entityId} like ${`%:${studentId}`})
        or ${auditLog.data}->>'studentId' = ${studentId}
        or ${auditLog.data}->'studentIds' ? ${studentId}`,
    );
}

/** Parent asks for one linked child's data to be deleted. Idempotent while a request is open. */
export async function requestChildDeletion(
  db: DbOrTx,
  parentId: string,
  studentId: string,
  note: string | null,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const [child] = await tx
      .select({ schoolId: schoolClass.schoolId })
      .from(parentStudent)
      .innerJoin(student, eq(student.id, parentStudent.studentId))
      .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
      .where(and(eq(parentStudent.parentId, parentId), eq(parentStudent.studentId, studentId), isNull(student.deletedAt)));
    if (!child) throw forbidden();

    const [created] = await tx
      .insert(deletionRequest)
      .values({ schoolId: child.schoolId, studentId, requestedById: parentId, note })
      .onConflictDoNothing()
      .returning({ id: deletionRequest.id });
    if (!created) return { created: false };

    await writeAudit(tx, {
      action: "deletion.request",
      entity: "deletion_request",
      entityId: created.id,
      actorId: parentId,
      schoolId: child.schoolId,
      data: { studentId },
      ip,
    });
    return { created: true };
  });
}

/** Open deletion requests for the parent's children (by any of the child's parents). */
export async function listPendingRequestsForParent(db: Db, parentId: string) {
  const rows = await db
    .select({ studentId: deletionRequest.studentId, createdAt: deletionRequest.createdAt })
    .from(deletionRequest)
    .innerJoin(parentStudent, eq(parentStudent.studentId, deletionRequest.studentId))
    .where(and(eq(parentStudent.parentId, parentId), eq(deletionRequest.status, "pending")));
  return new Map(rows.map((r) => [r.studentId!, r.createdAt]));
}

/** Requests of the admin's school, newest first; open ones carry the child's and class's name. */
export async function listDeletionRequests(db: Db, schoolId: string, status: DeletionRequestStatus) {
  const rows = await db
    .select({
      id: deletionRequest.id,
      studentId: deletionRequest.studentId,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      className: schoolClass.name,
      requestedByName: user.name,
      requestedByEmail: user.email,
      note: deletionRequest.note,
      status: deletionRequest.status,
      rejectReason: deletionRequest.rejectReason,
      createdAt: deletionRequest.createdAt,
      resolvedAt: deletionRequest.resolvedAt,
    })
    .from(deletionRequest)
    .leftJoin(student, eq(student.id, deletionRequest.studentId))
    .leftJoin(schoolClass, eq(schoolClass.id, student.classId))
    .leftJoin(user, eq(user.id, deletionRequest.requestedById))
    .where(and(eq(deletionRequest.schoolId, schoolId), eq(deletionRequest.status, status)))
    .orderBy(desc(deletionRequest.createdAt))
    .limit(100);
  return rows;
}

export async function countPendingDeletionRequests(db: Db, schoolId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deletionRequest)
    .where(and(eq(deletionRequest.schoolId, schoolId), eq(deletionRequest.status, "pending")));
  return row?.count ?? 0;
}

async function openRequest(tx: Tx, requestId: string) {
  const [row] = await tx
    .select({ id: deletionRequest.id, studentId: deletionRequest.studentId, schoolId: deletionRequest.schoolId })
    .from(deletionRequest)
    .where(and(eq(deletionRequest.id, requestId), eq(deletionRequest.status, "pending")))
    .for("update");
  if (!row?.studentId) throw new UserError("Bu talep zaten sonuçlandırılmış.");
  return { ...row, studentId: row.studentId };
}

/**
 * Carries out a deletion request: hard-deletes the student and everything tied to them
 * (events, progress, invites, parent links, messages to them, notifications about them) and
 * scrubs personal fields from the audit trail. Call only after assertAdminOfDeletionRequest.
 */
export async function completeDeletionRequest(db: Db, admin: AuthUser, requestId: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const request = await openRequest(tx, requestId);
    const [row] = await tx
      .select({ classId: student.classId })
      .from(student)
      .where(eq(student.id, request.studentId))
      .for("update");
    if (!row) throw new UserError("Öğrenci bulunamadı.");

    await scrubAuditForStudent(tx, request.studentId);
    // Notifications belong to parents, so they do not cascade with the student.
    await tx.delete(notification).where(sql`${notification.payload}->>'studentId' = ${request.studentId}`);
    // Cascades to behavior events, progress, invite codes, parent links and messages to the
    // student (with their reads); consent records and this request keep a null link.
    await tx.delete(student).where(eq(student.id, request.studentId));

    await tx
      .update(deletionRequest)
      .set({ status: "completed", resolvedById: admin.id, resolvedAt: new Date() })
      .where(eq(deletionRequest.id, requestId));
    await writeAudit(tx, {
      action: "student.delete",
      entity: "student",
      entityId: request.studentId,
      actorId: admin.id,
      schoolId: request.schoolId,
      data: { classId: row.classId, deletionRequestId: requestId },
      ip,
    });
  });
}

/** Closes a request without deleting (e.g. the data must be kept by law). Admin only. */
export async function rejectDeletionRequest(db: Db, admin: AuthUser, requestId: string, reason: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const request = await openRequest(tx, requestId);
    await tx
      .update(deletionRequest)
      .set({ status: "rejected", rejectReason: reason, resolvedById: admin.id, resolvedAt: new Date() })
      .where(eq(deletionRequest.id, requestId));
    await writeAudit(tx, {
      action: "deletion.reject",
      entity: "deletion_request",
      entityId: requestId,
      actorId: admin.id,
      schoolId: request.schoolId,
      data: { studentId: request.studentId, reason },
      ip,
    });
  });
}

/**
 * Deletes a parent's own account at once: sessions, credentials, child links, reads,
 * notifications, preferences and push subscriptions cascade. Consent records stay as proof
 * (withdrawn, unlinked); the parent's IP is removed from audit rows. Children's school records
 * are kept unless `studentIds` asks for their deletion (a request for the admin).
 */
export async function deleteParentAccount(
  db: Db,
  parentId: string,
  options: { requestDeletionOf?: string[]; ip?: string | null } = {},
) {
  await db.transaction(async (tx) => {
    for (const studentId of options.requestDeletionOf ?? []) {
      await requestChildDeletion(tx, parentId, studentId, "Veli hesabını silerken talep etti.", options.ip);
    }

    const [row] = await tx.select({ role: user.role }).from(user).where(eq(user.id, parentId));
    if (row?.role !== "parent") throw forbidden();
    const schoolId = await parentSchoolId(tx, parentId);

    await tx
      .update(consentRecord)
      .set({ withdrawnAt: new Date() })
      .where(and(eq(consentRecord.userId, parentId), isNull(consentRecord.withdrawnAt)));
    await tx.update(auditLog).set({ ip: null }).where(eq(auditLog.actorId, parentId));
    // Written before the delete; actorId turns null with the user row, like every audit row.
    await writeAudit(tx, {
      action: "user.delete",
      entity: "user",
      entityId: parentId,
      actorId: parentId,
      schoolId,
      data: { role: "parent", requestedDeletionOf: options.requestDeletionOf?.length ?? 0 },
    });
    await tx.delete(user).where(eq(user.id, parentId));
  });
}

/** First name of the child an open request is about (for the admin's typed confirmation). */
export async function getOpenRequestFirstName(db: Db, requestId: string) {
  const [row] = await db
    .select({ firstName: student.firstName })
    .from(deletionRequest)
    .innerJoin(student, eq(student.id, deletionRequest.studentId))
    .where(and(eq(deletionRequest.id, requestId), eq(deletionRequest.status, "pending")));
  return row?.firstName ?? null;
}

/** School of the parent's children (single-school deployment), for audit rows about the parent. */
export async function parentSchoolId(db: DbOrTx, parentId: string) {
  const [row] = await db
    .select({ schoolId: schoolClass.schoolId })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .where(eq(parentStudent.parentId, parentId))
    .limit(1);
  return row?.schoolId ?? null;
}
