"use client";

import { useActionState, useTransition } from "react";
import { createInviteAction, revokeInviteAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INVITE_STATUS_LABEL, type InviteStatus } from "@/lib/invite-code";
import { InviteCard } from "./invite-card";
import { InviteOptionsFields } from "./invite-options";

type InviteRow = {
  id: string;
  status: InviteStatus;
  singleUse: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  usedByName: string | null;
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

export function StudentInvites({
  studentId,
  studentName,
  invites,
}: {
  studentId: string;
  studentName: string;
  invites: InviteRow[];
}) {
  const [state, action, pending] = useActionState(createInviteAction.bind(null, studentId, studentName), null);
  const [revoking, startRevoke] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 sm:max-w-sm print:hidden">
        <InviteOptionsFields idPrefix="student-invite" />
        <Button type="submit" disabled={pending} className="h-11 self-start">
          {pending ? "Üretiliyor…" : "Davet kodu üret"}
        </Button>
        <FormMessage state={state && !state.ok ? state : null} />
      </form>

      {state?.ok && (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="text-sm font-medium print:hidden">
            Kod üretildi. Güvenlik nedeniyle bu kod bir daha gösterilmez; şimdi yazdırın veya veliye iletin.
          </p>
          <div className="w-full max-w-xs">
            <InviteCard card={state.data} />
          </div>
          <Button variant="outline" className="h-11 print:hidden" onClick={() => window.print()}>
            Yazdır
          </Button>
        </div>
      )}

      {invites.length > 0 && (
        <div className="print:hidden">
          <h3 className="mb-2 font-medium">Üretilen kodlar</h3>
          <ul className="flex flex-col divide-y">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={inv.status === "active" ? "default" : "secondary"}>
                      {INVITE_STATUS_LABEL[inv.status]}
                    </Badge>
                    <span className="text-sm">{inv.singleUse ? "Tek kullanımlık" : "Çok kullanımlık"}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {dateFmt.format(inv.createdAt)} ·{" "}
                    {inv.expiresAt ? `son gün ${dateFmt.format(inv.expiresAt)}` : "süresiz"}
                    {inv.usedByName && ` · ${inv.usedByName} kullandı`}
                  </span>
                </div>
                {inv.status === "active" && (
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={revoking}
                    onClick={() =>
                      startRevoke(async () => {
                        await revokeInviteAction(inv.id);
                      })
                    }
                  >
                    İptal et
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
