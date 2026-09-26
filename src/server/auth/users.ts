import { hashPassword } from "better-auth/crypto";
import type { Db } from "@/server/db";
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
 * Callers are responsible for authorization.
 */
export async function createCredentialUser(db: Db, input: NewCredentialUser) {
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [created] = await tx
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

    await tx.insert(account).values({
      userId: created.id,
      accountId: created.id,
      providerId: "credential",
      password: passwordHash,
    });

    return created;
  });
}
