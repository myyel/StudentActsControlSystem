import type { Metadata } from "next";
import Link from "next/link";
import { LinkChildForm } from "@/components/parents/link-child-form";
import { RegisterForm } from "@/components/parents/register-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_HOME } from "@/lib/roles";
import { formatStudentName } from "@/lib/student-names";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { getRequestMeta } from "@/server/request";
import { previewInviteCode } from "@/server/services/invite";
import { consumeRateLimit, INVITE_RATE_LIMIT } from "@/server/services/rate-limit";

export const metadata: Metadata = { title: "Veli daveti" };

function Shell({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

export default async function InvitePage({ params }: PageProps<"/davet/[kod]">) {
  const { kod } = await params;
  const code = decodeURIComponent(kod);
  const [session, { ip }] = await Promise.all([getSession(), getRequestMeta()]);

  // Code lookups are rate limited per IP so codes cannot be guessed.
  if (!(await consumeRateLimit(db, `invite:${ip ?? "unknown"}`, INVITE_RATE_LIMIT))) {
    return (
      <Shell title="Biraz mola verelim">
        <p>1 dakika sonra sayfayı yenileyip tekrar deneyin.</p>
      </Shell>
    );
  }

  const preview = await previewInviteCode(db, code);
  if (preview.status !== "active") {
    return (
      <Shell title="Davet kodu kullanılamıyor">
        <p className="mb-4">{preview.message}</p>
        <Link href={session ? "/" : "/giris"} className={buttonVariants({ variant: "outline", className: "h-11" })}>
          {session ? "Ana sayfaya dön" : "Giriş sayfasına git"}
        </Link>
      </Shell>
    );
  }

  const child = `${formatStudentName(preview.child)} — ${preview.child.className}`;

  if (session && session.user.role !== "parent") {
    return (
      <Shell title="Veli daveti" description={child}>
        <p className="mb-4">
          Bu davet veliler içindir. Öğretmen veya yönetici hesabıyla açtınız; veli olarak kayıt olmak için önce çıkış
          yapın.
        </p>
        <Link href={ROLE_HOME[session.user.role]} className={buttonVariants({ variant: "outline", className: "h-11" })}>
          Ana sayfaya dön
        </Link>
      </Shell>
    );
  }

  if (session) {
    return (
      <Shell title="Çocuğunuzu ekleyin" description={`Bu kod ${child} için.`}>
        <LinkChildForm code={code} />
      </Shell>
    );
  }

  return (
    <Shell title="Veli hesabı oluşturun" description={`Bu kod ${child} için.`}>
      <RegisterForm code={code} />
      <p className="mt-6 text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link href={`/giris?next=${encodeURIComponent(`/davet/${code}`)}`} className="font-medium underline">
          Giriş yapıp kodu ekleyin
        </Link>
      </p>
    </Shell>
  );
}
