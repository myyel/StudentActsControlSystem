// Shared by client and server: no Node-only imports here.

/** No 0/O, 1/I/L: codes are read off paper and typed on phones. */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** Uppercases and strips spaces/dashes; returns null if the result cannot be a code. */
export function normalizeInviteCode(input: string): string | null {
  // Plain toUpperCase, not the Turkish locale: "i" must not become "İ".
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== INVITE_CODE_LENGTH) return null;
  for (const ch of code) if (!INVITE_ALPHABET.includes(ch)) return null;
  return code;
}

/** "ABCDEFGH" → "ABCD-EFGH" */
export const formatInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export const INVITE_VALIDITY_OPTIONS = [
  { value: "7", label: "7 gün" },
  { value: "14", label: "14 gün" },
  { value: "30", label: "30 gün" },
  { value: "none", label: "Süresiz" },
] as const;

export type InviteStatus = "active" | "used" | "expired" | "revoked";

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  active: "Aktif",
  used: "Kullanıldı",
  expired: "Süresi doldu",
  revoked: "İptal edildi",
};
