import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import type { Db, DbOrTx, Tx } from "@/server/db";
import {
  inviteCode,
  parentStudent,
  schoolClass,
  student,
  user,
  type ParentRelation,
} from "@/server/db/schema";
import {
  formatInviteCode,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
  type InviteStatus,
} from "@/lib/invite-code";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import { writeAudit } from "./audit";
import { recordConsents, type ConsentContext } from "./consent";

export type InviteOptions = { singleUse: boolean; validDays: number | null };

export const DEFAULT_INVITE_OPTIONS: InviteOptions = { singleUse: true, validDays: 14 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateInviteCode() {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

export const hashInviteCode = (normalizedCode: string) =>
  createHash("sha256").update(normalizedCode).digest("hex");

export function inviteUrl(code: string) {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/davet/${formatInviteCode(code)}`;
}

export const inviteQrSvg = (code: string) =>
  QRCode.toString(inviteUrl(code), { type: "svg", margin: 1, errorCorrectionLevel: "M" });

type InviteRow = Pick<typeof inviteCode.$inferSelect, "singleUse" | "expiresAt" | "usedAt" | "revokedAt">;

export function inviteStatus(row: InviteRow, now = new Date()): InviteStatus {
  if (row.revokedAt) return "revoked";
  if (row.singleUse && row.usedAt) return "used";
  if (row.expiresAt && row.expiresAt <= now) return "expired";
  return "active";
}

const STATUS_ERROR: Record<Exclude<InviteStatus, "active">, string> = {
  used: "Bu davet kodu daha önce kullanılmış. Öğretmeninizden yeni bir kod isteyin.",
  expired: "Bu davet kodunun süresi dolmuş. Öğretmeninizden yeni bir kod isteyin.",
  revoked: "Bu davet kodu iptal edilmiş. Öğretmeninizden yeni bir kod isteyin.",
};
const INVALID_CODE = "Davet kodu geçersiz. Kodu kontrol edip tekrar deneyin.";

/**
 * Creates one code per student. Call only after the actor passed assertTeacherOfStudent for each id.
 * Returns plain codes: this is the only time they exist outside the hash.
 */
export async function createInviteCodes(
  db: Db,
  actor: AuthUser,
  studentIds: string[],
  options: InviteOptions,
  ip?: string | null,
) {
  const expiresAt = options.validDays ? new Date(Date.now() + options.validDays * DAY_MS) : null;

  return db.transaction(async (tx) => {
    const students = await tx
      .select({ id: student.id, schoolId: schoolClass.schoolId })
      .from(student)
      .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
      .where(inArray(student.id, studentIds));
    if (students.length !== new Set(studentIds).size) throw forbidden();

    const created: { studentId: string; code: string }[] = [];
    for (const s of students) {
      const code = generateInviteCode();
      const [row] = await tx
        .insert(inviteCode)
        .values({
          studentId: s.id,
          codeHash: hashInviteCode(code),
          singleUse: options.singleUse,
          expiresAt,
          createdById: actor.id,
        })
        .returning({ id: inviteCode.id });
      await writeAudit(tx, {
        action: "invite.create",
        entity: "invite_code",
        entityId: row!.id,
        actorId: actor.id,
        schoolId: s.schoolId,
        data: { studentId: s.id, singleUse: options.singleUse, expiresAt },
        ip,
      });
      created.push({ studentId: s.id, code });
    }
    return created;
  });
}

/** Call only after assertTeacherOfStudent. */
export async function listInvitesForStudent(db: Db, studentId: string, now = new Date()) {
  const rows = await db
    .select({
      id: inviteCode.id,
      singleUse: inviteCode.singleUse,
      expiresAt: inviteCode.expiresAt,
      usedAt: inviteCode.usedAt,
      revokedAt: inviteCode.revokedAt,
      createdAt: inviteCode.createdAt,
      usedByName: user.name,
    })
    .from(inviteCode)
    .leftJoin(user, eq(user.id, inviteCode.usedById))
    .where(eq(inviteCode.studentId, studentId))
    .orderBy(desc(inviteCode.createdAt));
  return rows.map((r) => ({ ...r, status: inviteStatus(r, now) }));
}

/** The student an invite belongs to, so callers can run assertTeacherOfStudent. */
export async function getInviteStudentId(db: Db, inviteId: string) {
  const [row] = await db
    .select({ studentId: inviteCode.studentId })
    .from(inviteCode)
    .where(eq(inviteCode.id, inviteId));
  if (!row) throw forbidden();
  return row.studentId;
}

/** Call only after assertTeacherOfStudent on the invite's student. */
export async function revokeInviteCode(db: Db, actor: AuthUser, inviteId: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(inviteCode)
      .set({ revokedAt: new Date() })
      .where(and(eq(inviteCode.id, inviteId), isNull(inviteCode.revokedAt)))
      .returning({ id: inviteCode.id, studentId: inviteCode.studentId });
    if (!row) return;
    await writeAudit(tx, {
      action: "invite.revoke",
      entity: "invite_code",
      entityId: row.id,
      actorId: actor.id,
      data: { studentId: row.studentId },
      ip,
    });
  });
}

/** Loads a code with its student and class; null if the code does not exist or the child is unavailable. */
async function findInvite(db: DbOrTx, normalizedCode: string, lock: boolean) {
  const query = db
    .select({
      id: inviteCode.id,
      studentId: inviteCode.studentId,
      singleUse: inviteCode.singleUse,
      expiresAt: inviteCode.expiresAt,
      usedAt: inviteCode.usedAt,
      revokedAt: inviteCode.revokedAt,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      className: schoolClass.name,
      schoolId: schoolClass.schoolId,
    })
    .from(inviteCode)
    .innerJoin(student, eq(student.id, inviteCode.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .where(
      and(
        eq(inviteCode.codeHash, hashInviteCode(normalizedCode)),
        isNull(student.deletedAt),
        eq(student.active, true),
        isNull(schoolClass.archivedAt),
      ),
    );
  const [row] = lock ? await query.for("update", { of: inviteCode }) : await query;
  return row ?? null;
}

export type InvitePreview =
  | { status: "active"; child: { firstName: string; lastInitial: string | null; className: string } }
  | { status: Exclude<InviteStatus, "active">; message: string }
  | { status: "invalid"; message: string };

/** What an invite landing page may show: the child's first name, surname initial and class only. */
export async function previewInviteCode(db: Db, rawCode: string): Promise<InvitePreview> {
  const code = normalizeInviteCode(rawCode);
  const row = code ? await findInvite(db, code, false) : null;
  if (!row) return { status: "invalid", message: INVALID_CODE };

  const status = inviteStatus(row);
  if (status !== "active") return { status, message: STATUS_ERROR[status] };
  return {
    status: "active",
    child: { firstName: row.firstName, lastInitial: row.lastInitial, className: row.className },
  };
}

export type RedeemInput = {
  parentId: string;
  code: string;
  relation: ParentRelation;
} & ConsentContext;

/**
 * Links the parent to the invite's student. Must run inside a transaction: the invite row is
 * locked so a single-use code cannot be redeemed twice concurrently.
 */
export async function redeemInviteCode(tx: Tx, input: RedeemInput) {
  const code = normalizeInviteCode(input.code);
  const invite = code ? await findInvite(tx, code, true) : null;
  if (!invite) throw new UserError(INVALID_CODE);

  const [existing] = await tx
    .select({ studentId: parentStudent.studentId })
    .from(parentStudent)
    .where(and(eq(parentStudent.parentId, input.parentId), eq(parentStudent.studentId, invite.studentId)));
  // Already linked: nothing to do, and a single-use code is not consumed.
  if (existing) return { studentId: invite.studentId, alreadyLinked: true };

  const status = inviteStatus(invite);
  if (status !== "active") throw new UserError(STATUS_ERROR[status]);

  if (invite.singleUse) {
    await tx
      .update(inviteCode)
      .set({ usedAt: new Date(), usedById: input.parentId })
      .where(eq(inviteCode.id, invite.id));
  }

  await tx.insert(parentStudent).values({
    parentId: input.parentId,
    studentId: invite.studentId,
    relation: input.relation,
    inviteCodeId: invite.id,
  });
  await recordConsents(tx, input.parentId, invite.studentId, input);
  await writeAudit(tx, {
    action: "parent.link",
    entity: "parent_student",
    entityId: `${input.parentId}:${invite.studentId}`,
    actorId: input.parentId,
    schoolId: invite.schoolId,
    data: { inviteCodeId: invite.id, relation: input.relation },
    ip: input.ip,
  });

  return { studentId: invite.studentId, alreadyLinked: false };
}
