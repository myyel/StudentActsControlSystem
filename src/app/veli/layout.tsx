import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function ParentLayout({ children }: LayoutProps<"/veli">) {
  const { user } = await requirePageRole("parent");
  return <AppShell user={user}>{children}</AppShell>;
}
