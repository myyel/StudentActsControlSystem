"use client";

import { Share, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isIos, isStandalone } from "@/lib/pwa";

const DISMISS_KEY = "ios-guide-dismissed";

function Steps() {
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
      <li>
        Bu sayfayı <strong>Safari</strong>&apos;de açın ve <strong>Paylaş</strong> düğmesine dokunun{" "}
        <Share className="inline size-4 align-text-bottom" aria-label="(Paylaş simgesi)" /> (iPhone&apos;da altta,
        iPad&apos;de üstte).
      </li>
      <li>
        Listeyi kaydırıp <strong>Ana Ekrana Ekle</strong>{" "}
        <SquarePlus className="inline size-4 align-text-bottom" aria-label="(Ekle simgesi)" /> seçeneğine, sonra{" "}
        <strong>Ekle</strong>&apos;ye dokunun.
      </li>
      <li>
        Ana ekranda beliren <strong>Gelişim</strong> simgesiyle uygulamayı açın ve giriş yapın.
      </li>
      <li>
        <strong>Ayarlar</strong> sayfasında <strong>Bu cihazda bildirimleri aç</strong>&apos;a dokunun ve izin verin.
      </li>
    </ol>
  );
}

/**
 * "Add to Home Screen" guide: iOS/iPadOS 16.4+ delivers Web Push only to apps opened from the
 * home screen. `section` always shows (settings page); `banner` shows only on iOS in a browser
 * tab and can be dismissed.
 */
export function IosInstallGuide({ variant }: { variant: "section" | "banner" }) {
  const [device, setDevice] = useState<{ ios: boolean; installed: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Storage may be blocked; the banner just shows again.
    }
    // Browser-only checks, so they run after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevice({ ios: isIos(), installed: isStandalone() });
    setDismissed(hidden);
  }, []);

  if (variant === "banner") {
    if (!device?.ios || device.installed || dismissed) return null;
    return (
      <aside
        aria-label="Bildirimler için ana ekrana ekleyin"
        className="flex items-start gap-3 rounded-xl border border-emerald-600/40 bg-emerald-50 p-4 dark:bg-emerald-950/40"
      >
        <SquarePlus className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <p className="font-medium">Bildirim almak için uygulamayı ana ekranınıza ekleyin.</p>
          <Link href="/veli/ayarlar#ios-rehberi" className="self-start font-medium underline">
            Nasıl yapılır?
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Kapat"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Ignore; dismissing still works for this visit.
            }
          }}
        >
          <X aria-hidden />
        </Button>
      </aside>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {device?.ios && device.installed && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Uygulama ana ekrandan açılmış, bu adımlar tamam.</p>
      )}
      <p className="text-sm text-muted-foreground">
        iPhone ve iPad&apos;de anlık bildirimler yalnızca ana ekrana eklenmiş uygulamaya gelir (iOS 16.4 veya üstü).
      </p>
      <Steps />
    </div>
  );
}
