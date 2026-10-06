"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The admin's way home from any admin page: one clearly labelled button in the header. */
export function AdminNav() {
  const current = usePathname() === "/admin";
  return (
    <nav aria-label="Yönetici menüsü">
      <Link
        href="/admin"
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-colors sm:px-4",
          current ? "bg-primary-foreground text-primary" : "bg-white/12 text-primary-foreground hover:bg-white/20",
        )}
      >
        <LayoutDashboard className="size-5" aria-hidden />
        Yönetim paneli
      </Link>
    </nav>
  );
}
