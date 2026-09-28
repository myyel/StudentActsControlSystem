import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roles";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const { next, hesap } = await searchParams;
  const nextPath = safeRedirectPath(typeof next === "string" ? next : null);

  const session = await getSession();
  if (session) redirect(nextPath ?? ROLE_HOME[session.user.role]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      {hesap === "silindi" && (
        <p role="status" className="w-full max-w-sm rounded-lg border bg-card p-3 text-sm">
          Hesabınız silindi. Uygulamayı kullandığınız için teşekkür ederiz.
        </p>
      )}
      <LoginForm next={nextPath} />
    </main>
  );
}
