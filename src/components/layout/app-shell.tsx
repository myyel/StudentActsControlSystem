import { ROLE_LABEL } from "@/lib/roles";
import type { UserRole } from "@/server/db/schema";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = {
  user: { name: string; role: UserRole };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
