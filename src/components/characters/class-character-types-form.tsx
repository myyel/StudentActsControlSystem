"use client";

import { useState, useTransition } from "react";
import { resetClassCharacterTypesAction, updateClassCharacterTypesAction } from "@/app/ogretmen/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";
import { CharacterImage } from "./character-image";

type Props = {
  classId: string;
  /** The teacher picked the types (false: every active school type is offered). */
  custom: boolean;
  /** Stages shown per type: the class's level count. */
  maxLevel: number;
  types: { id: string; name: string; selected: boolean; stages: { name: string; assetUrl: string }[] }[];
  /** Students per type id in this class. */
  studentsByType: Record<string, number>;
};

/** Which character types the class offers. Students of a removed type move to the first picked one. */
export function ClassCharacterTypesForm({ classId, custom, maxLevel, types, studentsByType }: Props) {
  const [selected, setSelected] = useState(() => new Set(types.filter((t) => t.selected).map((t) => t.id)));
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);

  const picked = types.filter((t) => selected.has(t.id));
  const first = picked[0];
  // Every student whose type is not picked moves, including types the admin deactivated.
  const moving = Object.entries(studentsByType)
    .filter(([typeId]) => !selected.has(typeId))
    .reduce((sum, [, n]) => sum + n, 0);
  const unchanged = custom && types.every((t) => t.selected === selected.has(t.id));

  function toggle(id: string) {
    setState(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setConfirming(false);
    start(async () => setState(await updateClassCharacterTypesAction(classId, [...selected])));
  }

  function reset() {
    start(async () => {
      const result = await resetClassCharacterTypesAction(classId);
      if (result.ok) setSelected(new Set(types.map((t) => t.id)));
      setState(result);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3" disabled={pending}>
        <legend className="sr-only">Sınıfta kullanılacak karakter türleri</legend>
        <ul className="grid gap-3 lg:grid-cols-2">
          {types.map((t) => {
            const checked = selected.has(t.id);
            const count = studentsByType[t.id] ?? 0;
            return (
              <li key={t.id}>
                <label
                  className={cn(
                    "flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-3 transition-colors",
                    checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <span className="flex min-h-11 items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} className="size-5 shrink-0" />
                    <span className="font-display text-lg font-bold">{t.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{count} öğrenci</span>
                  </span>
                  <span className="grid grid-cols-5 gap-1" aria-hidden>
                    {t.stages.slice(0, maxLevel).map((stage, i) => (
                      <span key={i} className="flex flex-col items-center gap-1 text-center">
                        <CharacterImage stage={stage} size={56} decorative className="h-auto w-full max-w-14" />
                        <span className="text-xs leading-tight text-muted-foreground">{stage.name}</span>
                      </span>
                    ))}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Seçmediğiniz türler öğrenci detayında ve tahtadaki karakter seçiminde görünmez. Yeni öğrenciler listedeki ilk
        seçili türle başlar.
      </p>
      {picked.length === 0 && (
        <p role="alert" className="text-sm text-destructive">
          En az bir karakter türü seçin.
        </p>
      )}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || picked.length === 0 || unchanged}
          onClick={() => (moving > 0 ? setConfirming(true) : save())}
        >
          Türleri kaydet
        </Button>
        {custom && (
          <Button type="button" variant="outline" disabled={pending} onClick={reset}>
            Okul ayarına dön
          </Button>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Karakterler değişecek</DialogTitle>
            <DialogDescription>
              {moving} öğrencinin karakteri seçilmeyen bir türde. Bu öğrenciler {first?.name} türüne geçecek; seviyeleri
              korunur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={save}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
