"use server";

import { refresh } from "next/cache";
import { forbidden } from "@/server/auth/errors";
import { assertAdminOfCharacterType, assertAdminOfSchool } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { db } from "@/server/db";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { updateCharacterType, updateLevelThresholds } from "@/server/services/character";
import { characterTypeSchema, levelThresholdsSchema } from "@/server/validation/character";

// Order in every action: session → role → ownership → Zod → service.

export async function updateLevelThresholdsAction(_: unknown, formData: FormData): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("admin");
    if (!user.schoolId) throw forbidden();
    assertAdminOfSchool(user, user.schoolId);
    const input = levelThresholdsSchema.parse({ thresholds: formData.getAll("threshold") });
    const { ip } = await getRequestMeta();
    const { raised } = await updateLevelThresholds(db, user, user.schoolId, input.thresholds, ip);
    refresh();
    return ok(undefined, raised > 0 ? `Kaydedildi. ${raised} öğrencinin karakteri seviye atladı.` : "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCharacterTypeAction(
  typeId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("admin");
    await assertAdminOfCharacterType(user, typeId);
    const input = characterTypeSchema.parse({
      name: formData.get("name"),
      active: formData.get("active") === "on",
      stageNames: formData.getAll("stageName"),
    });
    const { ip } = await getRequestMeta();
    await updateCharacterType(db, user, typeId, input, ip);
    refresh();
    return ok(undefined, "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}
