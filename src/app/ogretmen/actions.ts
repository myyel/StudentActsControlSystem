"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { forbidden } from "@/server/auth/errors";
import { assertTeacherOfClass, assertTeacherOfStudent } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { formatInviteCode } from "@/lib/invite-code";
import { formatStudentName } from "@/lib/student-names";
import { setStudentCharacterType } from "@/server/services/character";
import { createClass, updateHomeDailyXpCap } from "@/server/services/class";
import {
  createInviteCodes,
  getInviteStudentId,
  inviteQrSvg,
  inviteUrl,
  revokeInviteCode,
} from "@/server/services/invite";
import { addStudents, listStudentsForClass, updateStudent } from "@/server/services/student";
import { createClassSchema, homeDailyXpCapSchema } from "@/server/validation/class";
import { classInviteSchema, inviteOptionsSchema } from "@/server/validation/invite";
import { studentCharacterSchema } from "@/server/validation/character";
import { bulkStudentsSchema, studentNameSchema } from "@/server/validation/student";

export type InviteCard = { studentName: string; code: string; url: string; qrSvg: string };

async function toInviteCard(studentName: string, code: string): Promise<InviteCard> {
  return { studentName, code: formatInviteCode(code), url: inviteUrl(code), qrSvg: await inviteQrSvg(code) };
}

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

export async function updateHomeDailyXpCapAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const { homeDailyXpCap } = homeDailyXpCapSchema.parse({ homeDailyXpCap: formData.get("homeDailyXpCap") });
    const { ip } = await getRequestMeta();
    await updateHomeDailyXpCap(db, user, classId, homeDailyXpCap, ip);
    refresh();
    return ok(undefined, "Kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
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

export async function setStudentCharacterTypeAction(
  studentId: string,
  characterTypeId: string,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfStudent(user, studentId);
    const input = studentCharacterSchema.parse({ characterTypeId });
    const { ip } = await getRequestMeta();
    await setStudentCharacterType(db, user, studentId, input.characterTypeId, ip);
    refresh();
    return ok(undefined, "Karakter değiştirildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function createInviteAction(
  studentId: string,
  studentName: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<InviteCard>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfStudent(user, studentId);
    const options = inviteOptionsSchema.parse(Object.fromEntries(formData));
    const { ip } = await getRequestMeta();
    const [created] = await createInviteCodes(db, user, [studentId], options, ip);
    refresh();
    return ok(await toInviteCard(studentName, created!.code));
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    const parsedId = z.uuid().safeParse(inviteId);
    if (!parsedId.success) throw forbidden();
    await assertTeacherOfStudent(user, await getInviteStudentId(db, parsedId.data));
    const { ip } = await getRequestMeta();
    await revokeInviteCode(db, user, parsedId.data, ip);
    refresh();
    return ok(undefined, "Kod iptal edildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function createClassInvitesAction(
  classId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<InviteCard[]>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const values = Object.fromEntries(formData);
    const options = inviteOptionsSchema.parse(values);
    const { onlyWithoutParent } = classInviteSchema.parse(values);

    const students = (await listStudentsForClass(db, classId)).filter(
      (s) => s.active && (!onlyWithoutParent || s.parentCount === 0),
    );
    if (students.length === 0) return ok([], "Davet kartı üretilecek öğrenci yok.");

    const { ip } = await getRequestMeta();
    const created = await createInviteCodes(db, user, students.map((s) => s.id), options, ip);
    const names = new Map(students.map((s) => [s.id, formatStudentName(s)]));
    const cards = await Promise.all(created.map((c) => toInviteCard(names.get(c.studentId) ?? "", c.code)));
    cards.sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));
    return ok(cards, `${cards.length} davet kartı üretildi.`);
  } catch (error) {
    return toActionError(error);
  }
}
