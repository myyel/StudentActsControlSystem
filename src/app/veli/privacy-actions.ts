"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { auth } from "@/server/auth/auth";
import { assertParentOfStudent } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { verifyUserPassword } from "@/server/auth/users";
import { ok, toActionError, UserError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { deleteParentAccount, requestChildDeletion } from "@/server/services/privacy";
import {
  DELETION_REQUEST_RATE_LIMIT,
  enforceRateLimit,
  PASSWORD_CONFIRM_RATE_LIMIT,
} from "@/server/services/rate-limit";
import { deleteAccountSchema, deletionRequestSchema } from "@/server/validation/privacy";

// Order in every action: session → role → ownership → Zod → service.

export async function requestChildDeletionAction(studentId: string, payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    await assertParentOfStudent(user, studentId);
    const input = deletionRequestSchema.parse(payload);
    await enforceRateLimit(db, `deletion-request:${user.id}`, DELETION_REQUEST_RATE_LIMIT);
    const { ip } = await getRequestMeta();
    const { created } = await requestChildDeletion(db, user.id, studentId, input.note, ip);
    refresh();
    return ok(undefined, created ? "Talebiniz okul yönetimine iletildi." : "Bu çocuk için zaten bekleyen bir talep var.");
  } catch (error) {
    return toActionError(error);
  }
}

/** Deletes the signed-in parent's account after re-entering the password. */
export async function deleteAccountAction(payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    const input = deleteAccountSchema.parse(payload);
    // Ownership of each child whose deletion is requested (the service checks it again).
    for (const studentId of input.requestDeletionOf) await assertParentOfStudent(user, studentId);
    await enforceRateLimit(db, `password-confirm:${user.id}`, PASSWORD_CONFIRM_RATE_LIMIT);
    if (!(await verifyUserPassword(db, user.id, input.password))) throw new UserError("Şifre hatalı.");

    const { ip } = await getRequestMeta();
    // Clears the session cookie; the session rows go with the account.
    await auth.api.signOut({ headers: await headers() });
    await deleteParentAccount(db, user.id, { requestDeletionOf: input.requestDeletionOf, ip });
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
