"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
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
