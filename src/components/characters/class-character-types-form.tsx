"use client";

import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { resetClassCharacterTypesAction, updateClassCharacterTypesAction } from "@/app/ogretmen/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";
import { CharacterImage } from "./character-image";
import { StageNamesEditor } from "./stage-names-editor";

export type ClassCharacterType = {
  id: string;
  name: string;
  selected: boolean;
  stages: { name: string; assetUrl: string }[];
  schoolStageNames: string[];
  classStageNames: (string | null)[];
};

type Props = {
  classId: string;
  /** The teacher picked the types (false: every active school type is offered). */
  custom: boolean;
  /** Stages shown per type: the class's level count. */
  maxLevel: number;
  /** Picked types first, in class order; the rest in school order. */
  types: ClassCharacterType[];
  /** Students per type id in this class. */
  studentsByType: Record<string, number>;
};

const iconButton =
  "flex size-11 items-center justify-center rounded-md border bg-card text-foreground hover:bg-accent disabled:pointer-events-none disabled:text-muted-foreground";

const signatureOf = (types: ClassCharacterType[]) => types.map((t) => `${t.id}:${t.selected}`).join(",");

/**
 * Which character types the class offers and in which order (the first goes to new students), and
 * the class's stage names. Students of a removed type move to the first picked one.
 */
export function ClassCharacterTypesForm({ classId, custom, maxLevel, types, studentsByType }: Props) {
  const [order, setOrder] = useState(() => types.map((t) => t.id));
  const [selected, setSelected] = useState(() => new Set(types.filter((t) => t.selected).map((t) => t.id)));
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);

  // Follow the server after a save or reset without remounting (the message stays visible).
  const signature = signatureOf(types);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setOrder(types.map((t) => t.id));
    setSelected(new Set(types.filter((t) => t.selected).map((t) => t.id)));
  }

  const byId = new Map(types.map((t) => [t.id, t]));
  // Picked types first (in the teacher's order), the others after them.
  const shown = [...order.filter((id) => selected.has(id)), ...order.filter((id) => !selected.has(id))].map(
    (id) => byId.get(id)!,
  );
  const picked = shown.filter((t) => selected.has(t.id));
  const first = picked[0];
  // Every student whose type is not picked moves, including types the admin deactivated.
  const moving = Object.entries(studentsByType)
    .filter(([typeId]) => !selected.has(typeId))
    .reduce((sum, [, n]) => sum + n, 0);
  const initialPick = types.filter((t) => t.selected).map((t) => t.id);
  const unchanged = custom && picked.map((t) => t.id).join() === initialPick.join();

  function toggle(id: string) {
    setState(null);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // A newly picked type goes to the end of the picked ones.
    setOrder([...order.filter((x) => x !== id && selected.has(x)), id, ...order.filter((x) => x !== id && !selected.has(x))]);
    setSelected(next);
  }

  function move(id: string, by: -1 | 1) {
    setState(null);
    const ids = picked.map((t) => t.id);
    const from = ids.indexOf(id);
    const to = from + by;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    setOrder([...ids, ...order.filter((x) => !selected.has(x))]);
  }

  function save() {
    setConfirming(false);
    start(async () => setState(await updateClassCharacterTypesAction(classId, picked.map((t) => t.id))));
  }

  function reset() {
    start(async () => setState(await resetClassCharacterTypesAction(classId)));
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3" disabled={pending}>
        <legend className="sr-only">Sınıfta kullanılacak karakter türleri</legend>
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((t) => {
            const checked = selected.has(t.id);
            const index = picked.indexOf(t);
            const count = studentsByType[t.id] ?? 0;
            const renamed = t.classStageNames.some((n) => n !== null);
            return (
              <li
                key={t.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border-2 p-3 transition-colors",
                  checked ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} className="size-5 shrink-0" />
                    {checked && (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        <span className="sr-only">Sıra </span>
                        {index + 1}
                      </span>
                    )}
                    <span className="font-display text-lg font-bold">{t.name}</span>
                    <span className="text-sm text-muted-foreground">{count} öğrenci</span>
                  </label>
                  {checked && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className={iconButton}
                        disabled={index === 0}
                        onClick={() => move(t.id, -1)}
                        aria-label={`${t.name}: yukarı taşı`}
                      >
                        <ArrowUp className="size-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={index === picked.length - 1}
                        onClick={() => move(t.id, 1)}
                        aria-label={`${t.name}: aşağı taşı`}
                      >
                        <ArrowDown className="size-5" aria-hidden />
                      </button>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1" aria-hidden>
                  {t.stages.slice(0, maxLevel).map((stage, i) => (
                    <span key={i} className="flex flex-col items-center gap-1 text-center">
                      <CharacterImage stage={stage} size={56} decorative className="h-auto w-full max-w-14" />
                      <span className="text-xs leading-tight text-muted-foreground">{stage.name}</span>
                    </span>
                  ))}
                </div>
                {editing === t.id ? (
                  <StageNamesEditor classId={classId} type={t} maxLevel={maxLevel} onClose={() => setEditing(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(t.id)}
                    aria-label={`Aşama adlarını düzenle: ${t.name}${renamed ? " (bu sınıfa özel)" : ""}`}
                    className="flex min-h-11 items-center gap-2 self-start rounded-md px-2 text-sm font-semibold text-sky-ink hover:bg-accent"
                  >
                    <Pencil className="size-4" aria-hidden />
                    Aşama adlarını düzenle
                    {renamed && <span className="font-normal text-muted-foreground">(bu sınıfa özel)</span>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Her öğrenci 1. sıradaki karakterle başlar. Bir karakteri tamamlayan öğrenci sıradaki karakterin ilk aşamasına
        geçer; son karakterden sonra yeniden 1. sıradakine döner. Seçmediğiniz türler sıraya girmez.
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
          Türleri ve sırayı kaydet
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
