import { and, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { DbOrTx } from "@/server/db";
import { account, user, type UserRole } from "@/server/db/schema";

type NewCredentialUser = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  schoolId?: string | null;
};

/**
 * Creates a user with an email/password account, bypassing public sign-up (which is disabled).
 * Run inside a transaction so the user and account rows are written together.
 * Callers are responsible for authorization.
 */
export async function createCredentialUser(db: DbOrTx, input: NewCredentialUser) {
  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(user)
    .values({
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      schoolId: input.schoolId ?? null,
      emailVerified: true,
    })
    .returning();
  if (!created) throw new Error("User insert returned no row");

  await db.insert(account).values({
    userId: created.id,
    accountId: created.id,
    providerId: "credential",
    password: passwordHash,
  });

  return created;
}

/** Checks the user's email/password credential (re-authentication before destructive actions). */
export async function verifyUserPassword(db: DbOrTx, userId: string, password: string) {
  const [row] = await db
    .select({ hash: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  if (!row?.hash) return false;
  return verifyPassword({ hash: row.hash, password });
}
