import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requirePageRole("admin");
  return <AppShell user={user}>{children}</AppShell>;
}
