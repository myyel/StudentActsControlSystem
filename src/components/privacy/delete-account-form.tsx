"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/veli/privacy-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/action-result";

type Props = { childList: { id: string; name: string; pending: boolean }[] };

/** The browser's push subscription dies with the account; unsubscribe it here as well. */
async function dropPushSubscription() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await (await registration?.pushManager?.getSubscription())?.unsubscribe();
  } catch {
    // Never blocks the deletion.
  }
}

export function DeleteAccountForm({ childList }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        start(async () => {
          const result = await deleteAccountAction({
            password: form.get("password"),
            requestDeletionOf: form.getAll("requestDeletionOf"),
          });
          if (!result.ok) {
            setState(result);
            return;
          }
          await dropPushSubscription();
          router.replace("/giris?hesap=silindi");
        });
      }}
    >
      {childList.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Çocuklarınızın okul kayıtları</legend>
          <p className="text-sm text-muted-foreground">
            İşaretlemezseniz kayıtlar okulda kalır; diğer veli ve öğretmen görmeye devam eder.
          </p>
          {childList.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="requestDeletionOf"
                value={c.id}
                disabled={c.pending}
                className="size-5 accent-destructive"
              />
              <span>
                {c.name} verilerinin silinmesini de talep et
                {c.pending && <span className="text-muted-foreground"> (talep zaten iletildi)</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Onaylamak için şifreniz</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" variant="destructive" className="h-11 w-fit" disabled={pending}>
        {pending ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
      </Button>
    </form>
  );
}
