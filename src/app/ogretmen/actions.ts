"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { assertTeacherOfClass, assertTeacherOfStudent } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { createClass } from "@/server/services/class";
import { addStudents, updateStudent } from "@/server/services/student";
import { createClassSchema } from "@/server/validation/class";
import { bulkStudentsSchema, studentNameSchema } from "@/server/validation/student";

// Order in every action: session → role → ownership → Zod → service.

export async function createClassAction(_: unknown, formData: FormData): Promise<ActionResult<never>> {
  let classId: string;
  try {
    const { user } = await requireRole("teacher");
    const input = createClassSchema.parse(Object.fromEntries(formData));
    const { ip } = await getRequestMeta();
    classId = (await createClass(db, user, input, ip)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/ogretmen/siniflar/${classId}`);
}

export async function addStudentAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const name = studentNameSchema.parse({
      firstName: formData.get("firstName"),
      lastInitial: formData.get("lastInitial") ?? "",
    });
    const { ip } = await getRequestMeta();
    await addStudents(db, user, classId, [name], ip);
    refresh();
    return ok({ count: 1 }, "Öğrenci eklendi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkAddStudentsAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const names = bulkStudentsSchema.parse(formData.get("names") ?? "");
    const { ip } = await getRequestMeta();
    const created = await addStudents(db, user, classId, names, ip);
    refresh();
    return ok({ count: created.length }, `${created.length} öğrenci eklendi.`);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateStudentAction(
  studentId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfStudent(user, studentId);
    const name = studentNameSchema.parse({
      firstName: formData.get("firstName"),
      lastInitial: formData.get("lastInitial") ?? "",
    });
    const { ip } = await getRequestMeta();
    await updateStudent(db, user, studentId, name, ip);
    refresh();
    return ok(undefined, "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setStudentActiveAction(studentId: string, active: boolean): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfStudent(user, studentId);
    const parsed = z.boolean().parse(active);
    const { ip } = await getRequestMeta();
    await updateStudent(db, user, studentId, { active: parsed }, ip);
    refresh();
    return ok(undefined, parsed ? "Öğrenci aktif." : "Öğrenci pasif.");
  } catch (error) {
    return toActionError(error);
  }
}
