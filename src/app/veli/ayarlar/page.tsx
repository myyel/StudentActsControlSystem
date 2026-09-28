import type { Metadata } from "next";
import Link from "next/link";
import { IosInstallGuide } from "@/components/notifications/ios-install-guide";
import { PreferenceSwitches } from "@/components/notifications/preference-switches";
import { PushToggle } from "@/components/notifications/push-toggle";
import { ChildDeletionRequest } from "@/components/privacy/child-deletion-request";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentName } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { getPreferences } from "@/server/services/notification";
import { listChildrenForParent } from "@/server/services/parent";
import { listPendingRequestsForParent } from "@/server/services/privacy";
import { getVapidConfig } from "@/server/services/push";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function ParentSettingsPage() {
  const { user } = await requirePageRole("parent");
  const [preferences, children, pendingDeletions] = await Promise.all([
    getPreferences(db, user.id),
    listChildrenForParent(db, user.id),
    listPendingRequestsForParent(db, user.id),
  ]);
  // Public by design: the browser needs it to subscribe.
  const publicKey = getVapidConfig()?.publicKey ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>

      <Card>
        <CardHeader>
          <CardTitle>Bildirim tercihleri</CardTitle>
          <CardDescription>
            Kapattığınız türler için bildirim oluşmaz. Mesajlar yine Mesajlar sayfasında görünür.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceSwitches preferences={preferences} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anlık bildirimler (bu cihaz)</CardTitle>
          <CardDescription>
            Uygulama kapalıyken telefonunuza veya bilgisayarınıza bildirim gelir. Her cihazda ayrıca açılır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushToggle publicKey={publicKey} />
        </CardContent>
      </Card>

      <Card id="verileriniz" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>Verileriniz</CardTitle>
          <CardDescription>
            KVKK kapsamında hesabınıza ve çocuklarınıza ait verileri indirebilir, silinmesini isteyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {/* Plain links: route handlers answer with a file download. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler; <Link> would prefetch it */}
            <a href="/veli/disa-aktar?bicim=json" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
              Tüm verilerimi indir (JSON)
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler; <Link> would prefetch it */}
            <a href="/veli/disa-aktar?bicim=csv" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
              Davranış geçmişi (Excel/CSV)
            </a>
          </div>
          {children.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">Çocuğunuzun verilerinin silinmesi</h3>
              {children.map((c) => (
                <ChildDeletionRequest
                  key={c.id}
                  studentId={c.id}
                  childName={formatStudentName(c)}
                  pendingSince={pendingDeletions.get(c.id) ?? null}
                />
              ))}
            </div>
          )}
          <Link href="/veli/hesabi-sil" className="inline-flex min-h-11 w-fit items-center text-sm text-destructive underline underline-offset-2">
            Hesabımı sil
          </Link>
        </CardContent>
      </Card>

      <Card id="ios-rehberi" className="scroll-mt-4">
        <CardHeader>
          <CardTitle>iPhone ve iPad: Ana ekrana ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <IosInstallGuide variant="section" />
        </CardContent>
      </Card>
    </div>
  );
}
