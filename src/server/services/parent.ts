import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { parentStudent, schoolClass, student, user, type ParentRelation } from "@/server/db/schema";
import { createCredentialUser } from "@/server/auth/users";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import type { ConsentContext } from "./consent";
import { redeemInviteCode } from "./invite";

export const EMAIL_TAKEN =
  "Bu e-posta adresiyle zaten bir hesap var. Giriş yapıp davet kodunu hesabınıza ekleyin.";

type RegisterInput = {
  code: string;
  name: string;
  email: string;
  password: string;
  relation: ParentRelation;
} & ConsentContext;

/**
 * Creates a parent account and redeems the invite in one transaction:
 * an invalid code leaves no account behind.
 */
export async function registerParentWithInvite(db: Db, input: RegisterInput) {
  const email = input.email.toLowerCase();
  // Case-insensitive: addresses are stored lowercase, but not every writer may have normalized them.
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`);
  if (existing) throw new UserError(EMAIL_TAKEN);

  try {
    return await db.transaction(async (tx) => {
      const parent = await createCredentialUser(tx, {
        email,
        name: input.name,
        password: input.password,
        role: "parent",
      });
      const link = await redeemInviteCode(tx, { ...input, parentId: parent.id });
      return { parentId: parent.id, studentId: link.studentId };
    });
  } catch (error) {
    // Lost a race with another sign-up for the same address.
    if (isUniqueViolation(error)) throw new UserError(EMAIL_TAKEN);
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

const childColumns = {
  id: student.id,
  firstName: student.firstName,
  lastInitial: student.lastInitial,
  className: schoolClass.name,
  relation: parentStudent.relation,
};

/** Only the parent's own, non-deleted children. Every parent query goes through parent_student. */
export async function listChildrenForParent(db: Db, parentId: string) {
  return db
    .select(childColumns)
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .where(and(eq(parentStudent.parentId, parentId), isNull(student.deletedAt)))
    .orderBy(asc(student.firstName));
}

export async function getChildForParent(db: Db, parentId: string, studentId: string) {
  const [row] = await db
    .select(childColumns)
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .where(
      and(
        eq(parentStudent.parentId, parentId),
        eq(parentStudent.studentId, studentId),
        isNull(student.deletedAt),
      ),
    );
  if (!row) throw forbidden();
  return row;
}
