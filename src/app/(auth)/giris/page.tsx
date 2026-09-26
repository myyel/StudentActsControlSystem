import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.user.role]);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
