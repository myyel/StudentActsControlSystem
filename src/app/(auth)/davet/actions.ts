"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { auth } from "@/server/auth/auth";
import { requireRole } from "@/server/auth/session";
import { toActionError, UserError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { redeemInviteCode } from "@/server/services/invite";
import { registerParentWithInvite } from "@/server/services/parent";
import { consumeRateLimit, INVITE_RATE_LIMIT } from "@/server/services/rate-limit";
import { linkChildSchema, registerParentSchema } from "@/server/validation/parent";

const TOO_MANY = "Biraz mola verelim — 1 dakika sonra tekrar deneyin.";

async function assertInviteRateLimit(ip: string | null) {
  if (!(await consumeRateLimit(db, `invite:${ip ?? "unknown"}`, INVITE_RATE_LIMIT))) {
    throw new UserError(TOO_MANY);
  }
}

/** Public: the invite code is the authorization for creating a parent account. */
export async function registerParentAction(_: unknown, formData: FormData): Promise<ActionResult<never>> {
  let studentId: string;
  try {
    const meta = await getRequestMeta();
    await assertInviteRateLimit(meta.ip);
    const input = registerParentSchema.parse(Object.fromEntries(formData));
    ({ studentId } = await registerParentWithInvite(db, { ...input, ...meta }));
    // Sets the session cookie through the nextCookies plugin.
    await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      headers: await headers(),
    });
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/veli/${studentId}?hosgeldin=1`);
}

/** Signed-in parent adds another child with a code. */
export async function linkChildAction(_: unknown, formData: FormData): Promise<ActionResult<never>> {
  let studentId: string;
  try {
    const { user } = await requireRole("parent");
    const meta = await getRequestMeta();
    await assertInviteRateLimit(meta.ip);
    const input = linkChildSchema.parse(Object.fromEntries(formData));
    ({ studentId } = await db.transaction((tx) => redeemInviteCode(tx, { ...input, ...meta, parentId: user.id })));
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/veli/${studentId}?hosgeldin=1`);
}
