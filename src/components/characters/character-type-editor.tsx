"use client";

import { useActionState } from "react";
import { updateCharacterTypeAction } from "@/app/admin/character-actions";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CharacterImage } from "./character-image";

type Props = {
  type: {
    id: string;
    name: string;
    active: boolean;
    editable: boolean;
    stages: { name: string; assetUrl: string }[];
  };
};

export function CharacterTypeEditor({ type }: Props) {
  const [state, formAction, pending] = useActionState(updateCharacterTypeAction.bind(null, type.id), null);
  const id = (suffix: string) => `${type.id}-${suffix}`;

  if (!type.editable) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{type.name}</h3>
          <Badge variant="secondary">Genel tür</Badge>
          {!type.active && <Badge variant="secondary">Pasif</Badge>}
        </div>
        <StageRow stages={type.stages} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("name")}>Tür adı</Label>
          <Input id={id("name")} name="name" defaultValue={type.name} required maxLength={40} className="h-11" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={type.active} className="size-5" />
          Öğretmenler seçebilir (aktif)
        </label>
      </div>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {type.stages.map((stage, i) => (
          <li key={i} className="flex flex-col items-center gap-2 rounded-lg bg-muted/40 p-2">
            <CharacterImage stage={stage} size={96} decorative />
            <Label htmlFor={id(`stage-${i}`)} className="self-start">
              {i + 1}. seviye
            </Label>
            <Input
              id={id(`stage-${i}`)}
              name="stageName"
              defaultValue={stage.name}
              required
              maxLength={40}
              className="h-11"
            />
          </li>
        ))}
      </ol>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 self-start">
        Kaydet
      </Button>
    </form>
  );
}

function StageRow({ stages }: { stages: { name: string; assetUrl: string }[] }) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stages.map((stage, i) => (
        <li key={i} className="flex flex-col items-center gap-1 text-center text-sm">
          <CharacterImage stage={stage} size={96} decorative />
          <span className="text-muted-foreground">{i + 1}. seviye</span>
          <span className="font-medium">{stage.name}</span>
        </li>
      ))}
    </ol>
  );
}
