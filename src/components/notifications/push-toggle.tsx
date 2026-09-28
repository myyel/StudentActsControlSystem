"use client";

import { useEffect, useState } from "react";
import { removePushSubscriptionAction } from "@/app/push-actions";
import { checkPushSubscriptionAction, savePushSubscriptionAction } from "@/app/veli/notification-actions";
import { Button } from "@/components/ui/button";
import { isIos, isPushSupported, isStandalone, vapidKeyToBytes } from "@/lib/pwa";

type State = "checking" | "on" | "off" | "denied" | "unsupported" | "ios-install" | "not-configured";

async function register() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

function sameKey(sub: PushSubscription, key: Uint8Array) {
  const current = sub.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((b, i) => b === key[i]);
}

/** Turns Web Push on or off for this browser (each device is subscribed separately). */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function check(): Promise<State> {
      if (!isPushSupported()) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
      if (!publicKey) return "not-configured";
      if (Notification.permission === "denied") return "denied";
      const registration = await register();
      const sub = await registration.pushManager.getSubscription();
      if (!sub) return "off";
      // The browser may hold another user's subscription (shared device).
      const result = await checkPushSubscriptionAction(sub.endpoint);
      return result.ok && result.data ? "on" : "off";
    }
    check()
      .catch(() => "unsupported" as const)
      .then((s) => {
        if (active) setState(s);
      });
    return () => {
      active = false;
    };
  }, [publicKey]);

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      // Must run in the tap handler: iOS asks for permission only on a user gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await register();
      const key = vapidKeyToBytes(publicKey);
      let sub = await registration.pushManager.getSubscription();
      if (sub && !sameKey(sub, key)) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const result = await savePushSubscriptionAction(sub.toJSON());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState("on");
    } catch {
      setError("Bildirimler açılamadı. Sayfayı yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Bildirimler kapatılamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const text: Record<State, string> = {
    checking: "Kontrol ediliyor…",
    on: "Bu cihazda anlık bildirimler açık.",
    off: "Bu cihazda anlık bildirimler kapalı. Açarsanız uygulama kapalıyken de haber alırsınız.",
    denied:
      "Bu tarayıcıda bildirim izni reddedilmiş. Tarayıcının site ayarlarından bu siteye bildirim izni verip sayfayı yenileyin.",
    unsupported: "Bu tarayıcı anlık bildirimleri desteklemiyor. Bildirimleri uygulama içinden takip edebilirsiniz.",
    "ios-install": "iPhone ve iPad'de anlık bildirim için uygulamayı önce ana ekrana eklemelisiniz (aşağıdaki adımlar).",
    "not-configured": "Anlık bildirimler henüz ayarlanmadı. Bildirimleri uygulama içinden takip edebilirsiniz.",
  };

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-sm">
        {text[state]}
      </p>
      {state === "off" && (
        <Button onClick={turnOn} disabled={busy} className="h-11 self-start">
          {busy ? "Açılıyor…" : "Bu cihazda bildirimleri aç"}
        </Button>
      )}
      {state === "on" && (
        <Button variant="outline" onClick={turnOff} disabled={busy} className="h-11 self-start">
          {busy ? "Kapatılıyor…" : "Bu cihazda bildirimleri kapat"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
