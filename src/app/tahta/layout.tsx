import { requirePageRole } from "@/server/auth/session";

// Full screen: no app shell. Board mode uses the teacher's normal session (phase 5 decision).
export default async function BoardLayout({ children }: LayoutProps<"/tahta">) {
  await requirePageRole("teacher");
  return <main className="flex min-h-dvh flex-1 flex-col bg-background">{children}</main>;
}
