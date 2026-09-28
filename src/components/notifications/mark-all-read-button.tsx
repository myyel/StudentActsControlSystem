"use client";

import { useTransition } from "react";
import { markAllNotificationsReadAction } from "@/app/veli/notification-actions";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="h-11"
      disabled={pending}
      onClick={() => start(async () => void (await markAllNotificationsReadAction()))}
    >
      Tümünü okundu yap
    </Button>
  );
}
