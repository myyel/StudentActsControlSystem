"use client";

import { useState, useTransition } from "react";
import { deleteMessageAction } from "@/app/ogretmen/message-actions";
import { Button } from "@/components/ui/button";

/** Two-step delete: the first tap asks for confirmation. */
export function DeleteMessageButton({ messageId, title }: { messageId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="h-11" onClick={() => setConfirming(true)} aria-label={`"${title}" mesajını sil`}>
        Sil
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Veliler de artık göremeyecek.</span>
      <Button
        variant="destructive"
        className="h-11"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deleteMessageAction(messageId);
            if (!result.ok) setError(result.error);
          })
        }
      >
        Evet, sil
      </Button>
      <Button variant="outline" className="h-11" onClick={() => setConfirming(false)}>
        Vazgeç
      </Button>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
