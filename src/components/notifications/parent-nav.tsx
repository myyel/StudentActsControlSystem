"use client";

import { Bell, House, Mail, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getParentBadgesAction } from "@/app/veli/notification-actions";
import { cn } from "@/lib/utils";

type Badges = { notifications: number; messages: number };

const countLabel = (n: number) => (n > 99 ? "99+" : String(n));

/** "/veli/<child id>/…" → the child id; other parent pages (mesajlar, ayarlar…) have none. */
const CHILD_PATH = /^\/veli\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

/** Home (the current child's dashboard), then messages, notifications and settings with unread counts. */
export function ParentNav({ initial }: { initial: Badges }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState(initial);

  // The layout (and its initial counts) survives client navigation, so refetch on every page.
  useEffect(() => {
    let active = true;
    getParentBadgesAction().then((r) => {
      if (active && r.ok) setBadges(r.data);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const items = [
    { href: "/veli/mesajlar", label: "Mesajlar", icon: Mail, count: badges.messages, unread: "okunmamış mesaj" },
    { href: "/veli/bildirimler", label: "Bildirimler", icon: Bell, count: badges.notifications, unread: "yeni bildirim" },
    { href: "/veli/ayarlar", label: "Ayarlar", icon: Settings, count: 0, unread: "" },
  ];

  const childId = CHILD_PATH.exec(pathname)?.[1];
  // "/veli" itself redirects to the first child.
  const homeHref = childId ? `/veli/${childId}` : "/veli";
  const atHome = pathname === homeHref;

  return (
    <nav aria-label="Veli menüsü" className="flex items-center gap-1">
      <Link
        href={homeHref}
        aria-current={atHome ? "page" : undefined}
        aria-label="Ana sayfa"
        className={cn(
          "mr-1 flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-extrabold transition-colors sm:px-4",
          atHome ? "bg-primary-foreground text-primary" : "bg-white/12 text-primary-foreground hover:bg-white/20",
        )}
      >
        <House className="size-5" aria-hidden />
        <span className="hidden sm:inline">Ana sayfa</span>
      </Link>
      {items.map(({ href, label, icon: Icon, count, unread }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            aria-label={count > 0 ? `${label}, ${count} ${unread}` : label}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-white/15",
              current && "bg-primary-foreground text-primary hover:bg-primary-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
              >
                {countLabel(count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
