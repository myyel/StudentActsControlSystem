import type { BehaviorScope } from "@/server/db/schema";

export type DefaultBehavior = { name: string; icon: string; points: number; scope: BehaviorScope };

/** Loaded into every new class; teachers edit their own copy (approved 2026-09-27). */
export const DEFAULT_BEHAVIORS: DefaultBehavior[] = [
  { name: "Yardımlaştı", icon: "🤝", points: 1, scope: "school" },
  { name: "Derse katıldı", icon: "✋", points: 1, scope: "school" },
  { name: "Ödevini yaptı", icon: "📚", points: 1, scope: "school" },
  { name: "Nazik davrandı", icon: "💛", points: 1, scope: "school" },
  { name: "Sırasını bekledi", icon: "⏳", points: 1, scope: "school" },
  { name: "Düzenli çalıştı", icon: "🧹", points: 1, scope: "school" },
  { name: "Harika iş", icon: "⭐", points: 2, scope: "school" },
  { name: "Dersi böldü", icon: "🔇", points: -1, scope: "school" },
  { name: "Arkadaşını üzdü", icon: "💔", points: -1, scope: "school" },
  { name: "Ödevi eksik", icon: "📝", points: -1, scope: "school" },
  { name: "Odasını topladı", icon: "🛏️", points: 1, scope: "home" },
  { name: "Kitap okudu", icon: "📖", points: 1, scope: "home" },
  { name: "Ev işine yardım etti", icon: "🍽️", points: 1, scope: "home" },
  { name: "Dişlerini fırçaladı", icon: "🪥", points: 1, scope: "home" },
];

/**
 * Quick picks in the behavior type form, grouped for scanning; any emoji can still be typed.
 * Kept to emoji that render on older Android/Windows devices (Unicode 13 and earlier).
 */
export const BEHAVIOR_ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Ders ve başarı",
    icons: ["⭐", "📚", "📝", "✏️", "📖", "🧠", "💡", "🔢", "🔬", "🌍", "💻", "🎨", "🎵", "🎭", "🏆", "🎯", "✅", "🚀"],
  },
  {
    label: "Katılım",
    icons: ["✋", "🙋", "🗣️", "👂", "🤔", "💬", "👀"],
  },
  {
    label: "Arkadaşlık ve değerler",
    icons: ["🤝", "💛", "❤️", "🙏", "👏", "🤗", "😊", "🌈", "🕊️", "🧩", "🎁", "🌟"],
  },
  {
    label: "Düzen ve sorumluluk",
    icons: ["🧹", "⏳", "⏰", "🎒", "🗂️", "🗑️", "♻️", "🌱", "🧼", "📅", "🚶"],
  },
  {
    label: "Hareket ve oyun",
    icons: ["🏃", "⚽", "🏀", "🚲", "🤸", "🧸", "🎲", "🏅"],
  },
  {
    label: "Ev",
    icons: ["🛏️", "🍽️", "🪥", "🥦", "🍎", "💧", "👕", "🧦", "🐶", "🪴", "🛁", "😴"],
  },
  {
    label: "Uyarı",
    icons: ["⚠️", "🔇", "💔", "🚫", "🐢", "📵", "🗯️", "🙉"],
  },
];

export const BEHAVIOR_ICON_CHOICES = BEHAVIOR_ICON_GROUPS.flatMap((group) => group.icons);
