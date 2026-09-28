import { z } from "@/lib/zod";
import { UserError } from "@/server/action-result";
import { AuthError } from "@/server/auth/errors";

// Helpers for route handlers that return a file (KVKK exports).

export function exportFileName(base: string, format: "json" | "csv") {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());
  return `${base}-${day}.${format}`;
}

/** A private, uncached attachment: exports hold personal data. */
export function download(body: string, fileName: string, contentType: "application/json" | "text/csv") {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Expected failures as plain-text responses; anything else surfaces as a server error. */
export function downloadError(error: unknown) {
  if (error instanceof AuthError) return new Response("Bu işlem için yetkiniz yok.", { status: 403 });
  if (error instanceof UserError) return new Response(error.message, { status: 429 });
  if (error instanceof z.ZodError) return new Response("Geçersiz istek.", { status: 400 });
  throw error;
}
