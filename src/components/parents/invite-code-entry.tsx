"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInviteCode, normalizeInviteCode } from "@/lib/invite-code";

/** Takes a typed code to its invite page, where the server validates it. */
export function InviteCodeEntry() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeInviteCode(String(new FormData(event.currentTarget).get("code") ?? ""));
    if (!code) {
      setError("Kod 8 karakter olmalı (ör. ABCD-EFGH).");
      return;
    }
    router.push(`/davet/${formatInviteCode(code)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="invite-code">Davet kodu</Label>
        <Input
          id="invite-code"
          name="code"
          placeholder="ABCD-EFGH"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-11 font-mono uppercase"
        />
      </div>
      <Button type="submit" className="h-11">
        Devam
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
