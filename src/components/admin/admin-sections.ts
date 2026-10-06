import { ScrollText, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export type AdminSection = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Bright tones are fills only; text on them stays ink for AA contrast. */
  tone: { band: string; badge: string };
};

/** The admin areas; the home tiles and each page header share the same colour and icon. */
export const ADMIN_SECTIONS = {
  characters: {
    href: "/admin/karakterler",
    title: "Karakterler",
    description: "Seviye eşikleri, karakter türleri ve evrim aşamaları",
    icon: Sparkles,
    tone: { band: "bg-lav-soft", badge: "bg-lav text-ink" },
  },
  deletions: {
    href: "/admin/silme-talepleri",
    title: "Silme talepleri",
    description: "Velilerin KVKK silme talepleri ve öğrenci verisi dışa aktarma",
    icon: ShieldCheck,
    tone: { band: "bg-sky-soft", badge: "bg-sky text-ink" },
  },
  audit: {
    href: "/admin/denetim",
    title: "Denetim kaydı",
    description: "Kritik işlemlerin kim tarafından, ne zaman yapıldığı",
    icon: ScrollText,
    tone: { band: "bg-grass-soft", badge: "bg-grass text-ink" },
  },
} satisfies Record<string, AdminSection>;

/** Raised card used for every content block on admin pages. */
export const adminCardClass = "rounded-[1.75rem] bg-card shadow-[0_6px_0_var(--kid-shadow)]";
