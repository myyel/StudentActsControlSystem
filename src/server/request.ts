import { headers } from "next/headers";

export type RequestMeta = { ip: string | null; userAgent: string | null };

/** Client IP and user agent of the current request (behind a reverse proxy in production). */
export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent"),
  };
}
