/** Accepts only same-origin paths, so ?next= cannot send users to another site. */
export function safeRedirectPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
