"use client";

import { useActionState } from "react";
import { registerParentAction } from "@/app/(auth)/davet/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentFields, RelationField } from "./consent-fields";

export function RegisterForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(registerParentAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="code" value={code} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Adınız ve soyadınız</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="h-11"
        />
        <p className="text-sm text-muted-foreground">En az 8 karakter.</p>
      </div>
      <RelationField />
      <ConsentFields />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </Button>
    </form>
  );
}
