"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { markMessageReadAction, reactToMessageAction } from "@/app/veli/message-actions";
import { Button } from "@/components/ui/button";
import { REACTIONS } from "@/lib/messages";
import type { MessageReaction } from "@/server/db/schema";

/**
 * Opening the message marks it read (read receipt for the teacher); two quick reactions,
 * tapping the chosen one again clears it. No free-text replies in the MVP.
 */
export function MessageReactions({
  messageId,
  read,
  reaction,
}: {
  messageId: string;
  read: boolean;
  reaction: MessageReaction | null;
}) {
  const [current, setCurrent] = useOptimistic(reaction);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!read) void markMessageReadAction(messageId);
  }, [messageId, read]);

  function choose(next: MessageReaction) {
    const value = current === next ? null : next;
    setError(null);
    start(async () => {
      setCurrent(value);
      const result = await reactToMessageAction(messageId, value);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Hızlı tepki" className="flex flex-wrap gap-2">
        {(Object.keys(REACTIONS) as MessageReaction[]).map((r) => (
          <Button
            key={r}
            variant={current === r ? "default" : "outline"}
            aria-pressed={current === r}
            disabled={pending}
            onClick={() => choose(r)}
            className="h-11 text-base"
          >
            <span aria-hidden>{REACTIONS[r].emoji}</span> {REACTIONS[r].label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
