import Link from "next/link";
import { LogoMark } from "@/components/app-icon";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  user: { name: string; role: UserRole };
  /** Role-specific header links (e.g. the parent's messages and notifications). */
  nav?: React.ReactNode;
  /** Page backdrop, e.g. "calm-backdrop" for the teacher screens. */
  className?: string;
  children: React.ReactNode;
};

export function AppShell({ user, nav, className, children }: AppShellProps) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col", className)}>
      {/*
        Dark ink bar, the same colour as the main "Puanla" button; links and buttons on it use light tones.
        Sticky while scrolling; z-30 keeps it over the matrix's sticky column (z-20) and under the undo bar and dialogs.
      */}
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-primary px-3 py-2 text-primary-foreground shadow-[0_2px_0_var(--kid-shadow)] sm:px-4 print:hidden">
        <Link
          href={ROLE_HOME[user.role]}
          aria-label="Gelişim Yolculuğu ana sayfa"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl pr-1"
        >
          <LogoMark aria-hidden className="size-10" />
          <span className="hidden font-display text-lg leading-none font-extrabold md:inline">Gelişim Yolculuğu</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {nav}
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="text-xs text-primary-foreground/75">{ROLE_LABEL[user.role]}</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4 print:p-0">{children}</main>
    </div>
  );
}
