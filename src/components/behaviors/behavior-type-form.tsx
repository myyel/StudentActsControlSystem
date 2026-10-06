"use client";

import { useActionState, useState } from "react";
import { BEHAVIOR_ICON_GROUPS } from "@/content/default-behaviors";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_POINTS, MIN_POINTS } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";
import type { BehaviorScope } from "@/server/db/schema";

type Props = {
  scope: BehaviorScope;
  action: (prev: unknown, formData: FormData) => Promise<ActionResult<undefined>>;
  initial?: { name: string; icon: string; points: number };
  submitLabel: string;
  onDone?: () => void;
};

export function BehaviorTypeForm({ scope, action, initial, submitLabel, onDone }: Props) {
  const [icon, setIcon] = useState(initial?.icon ?? "⭐");
  const [state, formAction, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone?.();
    return result;
  }, null);
  const idPrefix = initial ? "edit" : `new-${scope}`;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="scope" value={scope} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Simge</legend>
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border p-2">
          {BEHAVIOR_ICON_GROUPS.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-1">
                {group.icons.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setIcon(choice)}
                    aria-pressed={icon === choice}
                    aria-label={`Simge ${choice}`}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-md border text-xl",
                      icon === choice ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent",
                    )}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-icon`} className="shrink-0">
            veya yazın:
          </Label>
          <Input
            id={`${idPrefix}-icon`}
            name="icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={16}
            className="h-11 w-24 text-center text-xl"
          />
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-name`}>Ad</Label>
          <Input id={`${idPrefix}-name`} name="name" defaultValue={initial?.name} required maxLength={40} className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-points`}>Puan</Label>
          <Input
            id={`${idPrefix}-points`}
            name="points"
            type="number"
            inputMode="numeric"
            defaultValue={initial?.points ?? 1}
            min={scope === "home" ? 1 : MIN_POINTS}
            max={MAX_POINTS}
            required
            className="h-11"
          />
        </div>
      </div>
      {scope === "home" && (
        <p className="text-sm text-muted-foreground">Ev davranışları yalnızca olumlu puanlı olabilir; veliler listeden seçer.</p>
      )}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
