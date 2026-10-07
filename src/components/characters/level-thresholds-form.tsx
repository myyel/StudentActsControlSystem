"use client";

import { useActionState } from "react";
import { updateLevelThresholdsAction } from "@/app/admin/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultCompleteXp } from "@/lib/character";

export function LevelThresholdsForm({ thresholds, completeXp }: { thresholds: number[]; completeXp: number }) {
  const [state, formAction, pending] = useActionState(updateLevelThresholdsAction, null);
  // Empty while it is the automatic value, so it keeps following the thresholds.
  const automatic = defaultCompleteXp(thresholds);

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
      <div className="flex max-w-xs flex-col gap-2">
        <Label htmlFor="complete-xp">Yeni karaktere geçiş (XP)</Label>
        <Input
          id="complete-xp"
          name="completeXp"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={completeXp === automatic ? "" : completeXp}
          placeholder="Otomatik"
          className="h-11"
        />
        <span className="text-xs text-muted-foreground">
          Öğrenci bir karakterde bu XP&apos;ye ulaşınca karakteri tamamlanır ve sıradaki karakterin ilk aşamasına geçer.
          Son seviyenin eşiğinden büyük olmalıdır. Boş bırakırsanız son aşama, bir önceki aşama kadar sürer (şu an{" "}
          {automatic} XP).
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Eşikler tüm karakter türleri için ortaktır. Eşikleri düşürmek, yeni eşiğe ulaşan öğrencileri hemen yükseltir;
        yükseltmek kimsenin seviyesini düşürmez. Öğretmenin kendi seviye ayarını koyduğu sınıflar etkilenmez.
      </p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 self-start">
        Eşikleri kaydet
      </Button>
    </form>
  );
}
