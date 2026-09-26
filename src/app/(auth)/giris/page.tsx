import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(typeof next === "string" ? next : null);

  const session = await getSession();
  if (session) redirect(nextPath ?? ROLE_HOME[session.user.role]);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm next={nextPath} />
    </main>
  );
}
