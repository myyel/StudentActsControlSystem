import type { MessageReaction } from "@/server/db/schema";

export const MESSAGE_TITLE_MAX = 120;
export const MESSAGE_BODY_MAX = 2000;

export const REACTIONS: Record<MessageReaction, { emoji: string; label: string }> = {
  seen: { emoji: "👍", label: "Gördüm" },
  thanks: { emoji: "🙏", label: "Teşekkürler" },
};

export const formatMessageDate = (date: Date, timeZone = "Europe/Istanbul") =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone }).format(date);
