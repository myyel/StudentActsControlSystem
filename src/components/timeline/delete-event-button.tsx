"use client";

import { useState, useTransition } from "react";
import { deleteEventAction } from "@/app/ogretmen/scoring-actions";
import { Button } from "@/components/ui/button";

/** Two-step delete: the first tap asks for confirmation. */
export function DeleteEventButton({ eventId, label }: { eventId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="h-11" onClick={() => setConfirming(true)} aria-label={`${label} kaydını sil`}>
        Sil
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button
        variant="destructive"
        className="h-11"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deleteEventAction(eventId);
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
