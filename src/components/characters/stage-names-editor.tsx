"use client";

import { useState, useTransition } from "react";
import { updateClassStageNamesAction } from "@/app/ogretmen/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/server/action-result";

type Props = {
  classId: string;
  type: { id: string; name: string; schoolStageNames: string[]; classStageNames: (string | null)[] };
  /** Levels beyond the class's count are still named (in case the count grows), but shown last. */
  maxLevel: number;
  onClose: () => void;
};

/** The class's own stage names for one type; an empty field shows the school's name. */
export function StageNamesEditor({ classId, type, maxLevel, onClose }: Props) {
  const [names, setNames] = useState(() => type.classStageNames.map((n) => n ?? ""));
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);
  const id = (i: number) => `stage-name-${type.id}-${i}`;

  function save(next: string[]) {
    start(async () => {
      const result = await updateClassStageNamesAction(classId, type.id, next);
      setState(result);
      if (result.ok) setNames(next);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(names);
      }}
      className="flex flex-col gap-3 rounded-lg bg-card p-3"
    >
      <p className="text-sm text-muted-foreground">
        Boş bıraktığınız aşama okulun adıyla görünür. Adlar yalnızca bu sınıfta (tahta, veli paneli, kutlama) geçerlidir.
      </p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {type.schoolStageNames.map((schoolName, i) => (
          <li key={i} className="flex flex-col gap-1">
            <Label htmlFor={id(i)}>
              {i + 1}. seviye{i >= maxLevel && <span className="font-normal text-muted-foreground"> (sınıfta kullanılmıyor)</span>}
            </Label>
            <Input
              id={id(i)}
              maxLength={40}
              placeholder={schoolName}
              value={names[i]}
              onChange={(e) => {
                setState(null);
                setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)));
              }}
            />
          </li>
        ))}
      </ol>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Adları kaydet
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => save(names.map(() => ""))}>
          Okul adlarına dön
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
          Kapat
        </Button>
      </div>
    </form>
  );
}
