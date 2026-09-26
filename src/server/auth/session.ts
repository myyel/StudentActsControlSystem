import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ROLE_HOME } from "@/lib/roles";
import type { UserRole } from "@/server/db/schema";
import { auth } from "./auth";
import { AuthError, unauthenticated } from "./errors";
import { assertRole } from "./guards";

/** Session for the current request, deduplicated across a single render. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For Server Actions and route handlers: throws AuthError. */
export async function requireSession() {
  const session = await getSession();
  if (!session) throw unauthenticated();
  return session;
}

/** For Server Actions and route handlers: throws AuthError. */
export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  assertRole(session.user, ...roles);
  return session;
}

/** For pages and layouts: redirects instead of throwing. */
export async function requirePageRole(...roles: UserRole[]) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (!roles.includes(session.user.role)) redirect(ROLE_HOME[session.user.role]);
  return session;
}

/** For pages: an ownership failure renders 404, so other users' resources look nonexistent. */
export async function orNotFound<T>(check: Promise<T>): Promise<T> {
  try {
    return await check;
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }
}
