"use client";

import { useActionState } from "react";
import { updateHomeDailyXpCapAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_HOME_DAILY_XP_CAP } from "@/server/validation/class";

export function HomeCapForm({ classId, cap }: { classId: string; cap: number }) {
  const [state, formAction, pending] = useActionState(updateHomeDailyXpCapAction.bind(null, classId), null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="home-cap">Bir öğrencinin bir günde evden kazanabileceği en fazla XP</Label>
          <Input
            id="home-cap"
            name="homeDailyXpCap"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_HOME_DAILY_XP_CAP}
            defaultValue={cap}
            required
            className="h-11 w-32"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-11">
          Kaydet
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Tavan yalnızca XP&apos;ye uygulanır: tavanı aşan ev girişleri kaydedilir ve davranış dengesine eklenir, ama
        karakteri büyütmez. Gün, okulun saat dilimine göre gece yarısı yenilenir. 0, ev girişlerinin XP kazandırmaması
        demektir.
      </p>
      <FormMessage state={state} />
    </form>
  );
}
