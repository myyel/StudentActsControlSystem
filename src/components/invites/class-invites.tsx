"use client";

import { useActionState } from "react";
import { createClassInvitesAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { InviteCard } from "./invite-card";
import { InviteOptionsFields } from "./invite-options";

export function ClassInvites({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(createClassInvitesAction.bind(null, classId), null);
  const cards = state?.ok ? state.data : [];

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 sm:max-w-sm print:hidden">
        <InviteOptionsFields idPrefix="class-invite" />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="onlyWithoutParent" defaultChecked className="size-5" />
          <span>Yalnızca velisi henüz bağlanmamış öğrenciler</span>
        </label>
        <Button type="submit" disabled={pending} className="h-11 self-start">
          {pending ? "Üretiliyor…" : "Davet kartlarını üret"}
        </Button>
        <FormMessage state={state} />
      </form>

      {cards.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button className="h-11" onClick={() => window.print()}>
              Kartları yazdır
            </Button>
            <p className="text-sm text-muted-foreground">
              Kodlar bu sayfadan ayrılınca bir daha gösterilmez.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
            {cards.map((card) => (
              <InviteCard key={card.code} card={card} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
