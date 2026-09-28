"use client";

import { useState, useTransition } from "react";
import { completeDeletionAction, rejectDeletionAction } from "@/app/admin/privacy-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/server/action-result";

type Mode = null | "delete" | "reject";

/** Delete (typed first-name confirmation) or reject an open deletion request. */
export function DeletionRequestActions({ requestId, firstName }: { requestId: string; firstName: string }) {
  const [mode, setMode] = useState<Mode>(null);
  const [state, setState] = useState<ActionResult<undefined> | null>(null);
  const [pending, start] = useTransition();

  if (mode === null) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" className="h-11" onClick={() => setMode("delete")}>
          Kalıcı olarak sil
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setMode("reject")}>
          Reddet
        </Button>
      </div>
    );
  }

  const field = `${mode}-${requestId}`;
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get("value");
        start(async () =>
          setState(
            mode === "delete"
              ? await completeDeletionAction(requestId, { confirmName: value })
              : await rejectDeletionAction(requestId, { reason: value }),
          ),
        );
      }}
    >
      {mode === "delete" ? (
        <>
          <p className="text-sm">
            Öğrencinin puanları, ilerlemesi, davet kodları, veli bağlantıları ve kendisine yazılan mesajlar kalıcı olarak
            silinir. Denetim kayıtları kalır ama adı çıkarılır. <strong>Bu işlem geri alınamaz.</strong>
          </p>
          <Label htmlFor={field}>Onaylamak için öğrencinin adını yazın: {firstName}</Label>
          <Input id={field} name="value" autoComplete="off" required className="h-11" />
        </>
      ) : (
        <>
          <Label htmlFor={field}>Gerekçe (kayıt için; veliyi ayrıca bilgilendirin)</Label>
          <Textarea id={field} name="value" required minLength={3} maxLength={500} rows={2} />
        </>
      )}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={mode === "delete" ? "destructive" : "default"} className="h-11" disabled={pending}>
          {mode === "delete" ? "Evet, kalıcı olarak sil" : "Talebi reddet"}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => setMode(null)}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
