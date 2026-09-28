"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removePushSubscriptionAction } from "@/app/push-actions";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** A shared device must stop getting this user's notifications after sign out. */
async function dropPushSubscription() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    await removePushSubscriptionAction(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // Signing out must never fail because of push.
  }
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await dropPushSubscription();
    await authClient.signOut();
    router.replace("/giris");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={signOut} disabled={pending} className="h-11">
      Çıkış yap
    </Button>
  );
}
