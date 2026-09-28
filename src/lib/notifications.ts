import type { NotificationType } from "@/server/db/schema";

export const NOTIFICATION_TYPES: Record<NotificationType, { icon: string; label: string; description: string }> = {
  message: { icon: "✉️", label: "Mesajlar", description: "Öğretmenin duyuruları ve çocuğunuzla ilgili mesajlar" },
  positive_behavior: { icon: "⭐", label: "Olumlu davranışlar", description: "Okulda kazanılan olumlu puanlar" },
  negative_behavior: { icon: "💬", label: "Olumsuz davranışlar", description: "Okulda kaydedilen olumsuz davranışlar" },
  level_up: { icon: "🎉", label: "Seviye atlama", description: "Karakter yeni seviyeye ulaştığında" },
};

export const NOTIFICATION_TYPE_ORDER: NotificationType[] = ["message", "positive_behavior", "negative_behavior", "level_up"];
