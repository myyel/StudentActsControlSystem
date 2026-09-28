import type { Metadata } from "next";
import { IosInstallGuide } from "@/components/notifications/ios-install-guide";
import { PreferenceSwitches } from "@/components/notifications/preference-switches";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/session";
import { getPreferences } from "@/server/services/notification";
import { getVapidConfig } from "@/server/services/push";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function ParentSettingsPage() {
  const { user } = await requirePageRole("parent");
  const preferences = await getPreferences(db, user.id);
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
