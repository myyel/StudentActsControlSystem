import { ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/server/db/schema";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  user: { name: string; role: UserRole };
  /** Role-specific header links (e.g. the parent's messages and notifications). */
  nav?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ user, nav, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2 print:hidden">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <div className="flex items-center gap-2">
          {nav}
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4 print:p-0">{children}</main>
    </div>
  );
}
