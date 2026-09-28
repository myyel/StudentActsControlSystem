"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { assertAdminOfDeletionRequest } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, UserError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { completeDeletionRequest, getOpenRequestFirstName, rejectDeletionRequest } from "@/server/services/privacy";
import { completeDeletionSchema, rejectDeletionSchema } from "@/server/validation/privacy";

// Order in every action: session → role → ownership → Zod → service.

/** Irreversible: the admin confirms by typing the child's first name. */
export async function completeDeletionAction(requestId: string, payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("admin");
    await assertAdminOfDeletionRequest(user, requestId);
    const input = completeDeletionSchema.parse(payload);

    const firstName = await getOpenRequestFirstName(db, requestId);
    if (!firstName) throw new UserError("Bu talep zaten sonuçlandırılmış.");
    if (firstName.toLocaleLowerCase("tr") !== input.confirmName.toLocaleLowerCase("tr")) {
      throw new UserError("Yazdığınız ad öğrencinin adıyla eşleşmiyor.");
    }

    const { ip } = await getRequestMeta();
    await completeDeletionRequest(db, user, requestId, ip);
    refresh();
    return ok(undefined, "Öğrencinin verileri kalıcı olarak silindi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectDeletionAction(requestId: string, payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("admin");
    await assertAdminOfDeletionRequest(user, requestId);
    const input = rejectDeletionSchema.parse(payload);
    const { ip } = await getRequestMeta();
    await rejectDeletionRequest(db, user, requestId, input.reason, ip);
    refresh();
    return ok(undefined, "Talep reddedildi.");
  } catch (error) {
    return toActionError(error);
  }
}
