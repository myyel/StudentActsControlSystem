"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { setStudentCharacterTypeAction } from "@/app/ogretmen/actions";
import { CharacterAvatar } from "@/components/characters/character-avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BoardCharacterType = { id: string; name: string; stages: { name: string; assetUrl: string }[] };

type Props = {
  student: { id: string; firstName: string; level: number; characterTypeId: string };
  types: BoardCharacterType[];
  onClose: () => void;
};

/**
 * "Deniz, hangisi seninle büyüsün?" — the child picks a type together with the teacher. Cards show
 * every type at the child's own level (the level is kept). Two steps: tap a card, then confirm.
 */
export function CharacterChooser({ student, types, onClose }: Props) {
  const [chosen, setChosen] = useState(student.characterTypeId);
  // The full set (up to ten types) fits the board in two rows of five.
  const many = types.length > 4;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    if (chosen === student.characterTypeId) return onClose();
    start(async () => {
      const result = await setStudentCharacterTypeAction(student.id, chosen);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-surface="kid"
        className="max-h-[94dvh] overflow-y-auto rounded-[2rem] border-0 p-6 sm:max-w-5xl lg:p-8"
      >
        <DialogTitle className="text-center font-display text-4xl font-extrabold lg:text-5xl">
          {student.firstName}, hangisi seninle büyüsün?
        </DialogTitle>
        <DialogDescription className="text-center text-xl font-semibold text-foreground">
          Seviyen korunur — sadece karakterin değişir.
        </DialogDescription>

        <div
          role="radiogroup"
          aria-label="Karakter türü"
          className={cn("grid grid-cols-2 gap-4", many ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4")}
        >
          {types.map((t) => {
            const stage = t.stages[student.level - 1]!;
            const selected = t.id === chosen;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosen(t.id)}
                className={cn(
                  "kid-card relative flex min-h-20 flex-col items-center border-4 outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60",
                  many ? "gap-1 p-3" : "gap-2 p-4",
                  selected ? "border-grass-strong" : "border-transparent",
                )}
              >
                {selected && (
                  <span className="absolute -top-3 -right-3 flex size-10 items-center justify-center rounded-full bg-grass-strong text-white dark:text-ink">
                    <Check className="size-6" strokeWidth={3} aria-hidden />
                  </span>
                )}
                <CharacterAvatar stage={stage} size={many ? 88 : 140} className={many ? "2xl:[--avatar:130px]" : "2xl:[--avatar:180px]"} />
                <span className={cn("font-display font-extrabold", many ? "text-2xl" : "text-3xl")}>{t.name}</span>
                <span className={cn("font-semibold text-muted-foreground", many ? "text-base" : "text-lg")}>{stage.name}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-center text-xl text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-20 min-w-48 rounded-3xl bg-muted px-8 text-2xl font-bold outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={confirm}
            className="h-20 min-w-64 rounded-3xl bg-grass-strong px-8 text-2xl font-extrabold text-white shadow-[0_4px_0_#0d5537] outline-none focus-visible:ring-[4px] focus-visible:ring-ring/60 disabled:opacity-60 dark:text-ink"
          >
            Bunu seçiyorum!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
