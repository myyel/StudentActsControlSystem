"use client";

import { useActionState } from "react";
import { updateLevelThresholdsAction } from "@/app/admin/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LevelThresholdsForm({ thresholds }: { thresholds: number[] }) {
  const [state, formAction, pending] = useActionState(updateLevelThresholdsAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {thresholds.map((value, i) => (
          <li key={i} className="flex flex-col gap-2">
            <Label htmlFor={`threshold-${i}`}>{i + 1}. seviye</Label>
            {i === 0 ? (
              <>
                <input type="hidden" name="threshold" value={0} />
                <Input id={`threshold-${i}`} value="0 XP" disabled className="h-11" />
              </>
            ) : (
              <Input
                id={`threshold-${i}`}
                name="threshold"
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={value}
                required
                className="h-11"
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">
        Eşikler tüm karakter türleri için ortaktır. Eşikleri düşürmek, yeni eşiğe ulaşan öğrencileri hemen yükseltir;
        yükseltmek kimsenin seviyesini düşürmez.
      </p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 self-start">
        Eşikleri kaydet
      </Button>
    </form>
  );
}
