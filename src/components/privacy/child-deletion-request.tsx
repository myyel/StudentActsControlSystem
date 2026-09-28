"use client";

import { useState, useTransition } from "react";
import { requestChildDeletionAction } from "@/app/veli/privacy-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/action-result";
import { DELETION_NOTE_MAX } from "@/server/validation/privacy";

type Props = { studentId: string; childName: string; pendingSince: Date | null };

/** Asks the school to delete one child's data; the admin carries it out. */
export function ChildDeletionRequest({ studentId, childName, pendingSince }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionResult<undefined> | null>(null);
  const [pending, start] = useTransition();

  if (pendingSince) {
    return (
      <p className="text-sm text-muted-foreground">
        Silme talebi {pendingSince.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} tarihinde iletildi;
        okul yönetimi inceliyor.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="h-11 w-fit" onClick={() => setOpen(true)}>
        {childName} için silme talebi
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const note = new FormData(event.currentTarget).get("note");
        start(async () => setState(await requestChildDeletionAction(studentId, { note })));
      }}
    >
      <p className="text-sm">
        Okul yönetimi talebi inceledikten sonra {childName} adına tutulan tüm kayıtlar (puanlar, ilerleme, mesajlar)
        kalıcı olarak silinir ve geri getirilemez. Silmeden önce verileri indirmenizi öneririz.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`note-${studentId}`}>Not (isteğe bağlı)</Label>
        <Textarea id={`note-${studentId}`} name="note" maxLength={DELETION_NOTE_MAX} rows={2} />
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
          Talebi gönder
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
