"use client";

import { useActionState } from "react";
import { linkChildAction } from "@/app/(auth)/davet/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { ConsentFields, RelationField } from "./consent-fields";

export function LinkChildForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(linkChildAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="code" value={code} />
      <RelationField />
      <ConsentFields />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Ekleniyor…" : "Bu çocuğu hesabıma ekle"}
      </Button>
    </form>
  );
}
