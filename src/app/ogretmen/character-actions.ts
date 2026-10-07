"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { updateClassCharacterTypes, updateClassLevels, updateClassStageNames } from "@/server/services/character";
import { z } from "@/lib/zod";
import { forbidden } from "@/server/auth/errors";
import { classCharacterTypesSchema, classLevelsSchema, classStageNamesSchema } from "@/server/validation/character";

// Order in every action: session → role → ownership → Zod → service.

async function authorizeClass(classId: string) {
  const { user } = await requireRole("teacher");
  await assertTeacherOfClass(user, classId);
  return user;
}

const raisedMessage = (raised: number) =>
  raised > 0 ? `Kaydedildi. ${raised} öğrencinin karakteri seviye atladı.` : "Kaydedildi.";

export async function updateClassLevelsAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeClass(classId);
    const input = classLevelsSchema.parse({
      thresholds: formData.getAll("threshold"),
      completeXp: formData.get("completeXp"),
    });
    const { ip } = await getRequestMeta();
    const { raised } = await updateClassLevels(db, user, classId, input.thresholds, ip, input.completeXp ?? null);
    refresh();
    return ok(undefined, raisedMessage(raised));
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetClassLevelsAction(classId: string): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeClass(classId);
    const { ip } = await getRequestMeta();
    const { raised } = await updateClassLevels(db, user, classId, null, ip);
    refresh();
    return ok(undefined, raised > 0 ? `Okul ayarına dönüldü. ${raised} öğrencinin karakteri seviye atladı.` : "Okul ayarına dönüldü.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateClassCharacterTypesAction(classId: string, typeIds: string[]): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeClass(classId);
    const input = classCharacterTypesSchema.parse({ typeIds });
    const { ip } = await getRequestMeta();
    const { moved } = await updateClassCharacterTypes(db, user, classId, input.typeIds, ip);
    refresh();
    return ok(undefined, moved > 0 ? `Kaydedildi. ${moved} öğrencinin karakteri değişti.` : "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetClassCharacterTypesAction(classId: string): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeClass(classId);
    const { ip } = await getRequestMeta();
    await updateClassCharacterTypes(db, user, classId, null, ip);
    refresh();
    return ok(undefined, "Okul ayarına dönüldü.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateClassStageNamesAction(
  classId: string,
  typeId: string,
  names: string[],
): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeClass(classId);
    if (!z.uuid().safeParse(typeId).success) throw forbidden();
    const input = classStageNamesSchema.parse({ names });
    const { ip } = await getRequestMeta();
    await updateClassStageNames(db, user, classId, typeId, input.names, ip);
    refresh();
    return ok(undefined, "Aşama adları kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}
