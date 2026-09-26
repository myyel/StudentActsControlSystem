import { AppShell } from "@/components/layout/app-shell";
import { requirePageRole } from "@/server/auth/session";

export default async function TeacherLayout({ children }: LayoutProps<"/ogretmen">) {
  const { user } = await requirePageRole("teacher");
  return <AppShell user={user}>{children}</AppShell>;
}
