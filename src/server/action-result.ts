import { z } from "zod";
import { AuthError } from "@/server/auth/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** User-facing failure raised by services (e.g. an expired invite code). */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export const ok = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });

/** Maps expected failures to a result; anything else is rethrown so it surfaces as a server error. */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof UserError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: error.issues[0]?.message ?? "Bilgileri kontrol edin.",
      fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    };
  }
  throw error;
}
