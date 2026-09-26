"use server";

import { refresh } from "next/cache";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { forbidden } from "@/server/auth/errors";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import {
  createBehaviorType,
  getBehaviorTypeClassId,
  loadDefaultBehaviorTypes,
  moveBehaviorType,
  updateBehaviorType,
} from "@/server/services/behavior-type";
import { behaviorTypeSchema } from "@/server/validation/behavior";

// Order in every action: session → role → ownership → Zod → service.

/** Session, teacher role and ownership of the type's class. */
async function authorizeType(typeId: string) {
  const { user } = await requireRole("teacher");
  if (!z.uuid().safeParse(typeId).success) throw forbidden();
  await assertTeacherOfClass(user, await getBehaviorTypeClassId(db, typeId));
  return user;
}

const formValues = (formData: FormData) => ({
  name: formData.get("name"),
  icon: formData.get("icon"),
  points: formData.get("points"),
  scope: formData.get("scope"),
});

export async function createBehaviorTypeAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = behaviorTypeSchema.parse(formValues(formData));
    const { ip } = await getRequestMeta();
    await createBehaviorType(db, user, classId, input, ip);
    refresh();
    return ok(undefined, "Davranış eklendi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBehaviorTypeAction(
  typeId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeType(typeId);
    const input = behaviorTypeSchema.parse(formValues(formData));
    const { ip } = await getRequestMeta();
    await updateBehaviorType(db, user, typeId, input, ip);
    refresh();
    return ok(undefined, "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setBehaviorTypeActiveAction(typeId: string, active: boolean): Promise<ActionResult<undefined>> {
  try {
    const user = await authorizeType(typeId);
    const parsed = z.boolean().parse(active);
    const { ip } = await getRequestMeta();
    await updateBehaviorType(db, user, typeId, { active: parsed }, ip);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function moveBehaviorTypeAction(typeId: string, direction: "up" | "down"): Promise<ActionResult<undefined>> {
  try {
    await authorizeType(typeId);
    const parsed = z.enum(["up", "down"]).parse(direction);
    await moveBehaviorType(db, typeId, parsed);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadDefaultBehaviorTypesAction(classId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    await loadDefaultBehaviorTypes(db, classId);
    refresh();
    return ok(undefined, "Varsayılan liste yüklendi.");
  } catch (error) {
    return toActionError(error);
  }
}
