"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The teacher's way home from any class page: one clearly labelled button in the header. */
export function TeacherNav() {
  const current = usePathname() === "/ogretmen";
  return (
    <nav aria-label="Öğretmen menüsü">
      <Link
        href="/ogretmen"
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-colors sm:px-4",
          current ? "bg-primary-foreground text-primary" : "bg-white/12 text-primary-foreground hover:bg-white/20",
        )}
      >
        <LayoutGrid className="size-5" aria-hidden />
        Sınıflarım
      </Link>
    </nav>
  );
}
