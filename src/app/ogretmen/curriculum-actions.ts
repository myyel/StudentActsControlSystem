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
  createNode,
  getNodeClassId,
  getParentClassId,
  renameNode,
  reorderChildren,
  setNodeArchived,
  type NodeKind,
} from "@/server/services/curriculum";
import { nodeKindSchema, nodeNameSchema, reorderSchema } from "@/server/validation/curriculum";

// Order in every action: session → role → ownership → Zod → service.

function parseIds(kind: unknown, id: unknown): { kind: NodeKind; id: string } {
  const parsedKind = nodeKindSchema.safeParse(kind);
  const parsedId = z.uuid().safeParse(id);
  if (!parsedKind.success || !parsedId.success) throw forbidden();
  return { kind: parsedKind.data, id: parsedId.data };
}

/** `parentId` is the class id for subjects, the subject id for topics, the topic id for stages. */
export async function createNodeAction(
  kind: NodeKind,
  parentId: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    const target = parseIds(kind, parentId);
    await assertTeacherOfClass(user, await getParentClassId(db, target.kind, target.id));
    const name = nodeNameSchema(target.kind).parse(formData.get("name"));
    const { ip } = await getRequestMeta();
    await createNode(db, user, target.kind, target.id, name, ip);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function renameNodeAction(
  kind: NodeKind,
  id: string,
  _: unknown,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    const target = parseIds(kind, id);
    await assertTeacherOfClass(user, await getNodeClassId(db, target.kind, target.id));
    const name = nodeNameSchema(target.kind).parse(formData.get("name"));
    const { ip } = await getRequestMeta();
    await renameNode(db, user, target.kind, target.id, name, ip);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setNodeArchivedAction(kind: NodeKind, id: string, archived: boolean): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    const target = parseIds(kind, id);
    await assertTeacherOfClass(user, await getNodeClassId(db, target.kind, target.id));
    const parsed = z.boolean().parse(archived);
    const { ip } = await getRequestMeta();
    await setNodeArchived(db, user, target.kind, target.id, parsed, ip);
    refresh();
    return ok(undefined, parsed ? "Arşivlendi." : "Geri alındı.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderAction(kind: NodeKind, parentId: string, orderedIds: string[]): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    const target = parseIds(kind, parentId);
    await assertTeacherOfClass(user, await getParentClassId(db, target.kind, target.id));
    const ids = reorderSchema.parse(orderedIds);
    const { ip } = await getRequestMeta();
    await reorderChildren(db, user, target.kind, target.id, ids, ip);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
