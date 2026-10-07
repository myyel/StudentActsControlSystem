"use client";

import { useActionState, useState, useTransition } from "react";
import { resetClassLevelsAction, updateClassLevelsAction } from "@/app/ogretmen/character-actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultCompleteXp, MAX_LEVEL, MIN_CLASS_LEVELS } from "@/lib/character";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";

type Props = {
  classId: string;
  thresholds: number[];
  /** Character XP at which a student moves on to the next character. */
  completeXp: number;
  /** The class has its own levels (false: it follows the school). */
  custom: boolean;
  schoolThresholds: number[];
  /** Stage names of the first offered type, as an example per level. */
  exampleStages: string[];
  /** Students per stored level in this class. */
  studentsByLevel: Record<number, number>;
};

/** Empty while the completion XP is the automatic one, so it keeps following the thresholds. */
const completeField = (thresholds: number[], completeXp: number) =>
  completeXp === defaultCompleteXp(thresholds) ? "" : String(completeXp);

const COUNTS = Array.from({ length: MAX_LEVEL - MIN_CLASS_LEVELS + 1 }, (_, i) => MIN_CLASS_LEVELS + i);

/** Level count (2–5) and XP thresholds of one class. */
export function ClassLevelsForm({
  classId,
  thresholds,
  completeXp,
  custom,
  schoolThresholds,
  exampleStages,
  studentsByLevel,
}: Props) {
  const [state, formAction, saving] = useActionState(updateClassLevelsAction.bind(null, classId), null);
  const [resetState, setResetState] = useState<ActionResult<undefined> | null>(null);
  const [resetting, start] = useTransition();
  const [values, setValues] = useState(() => thresholds.map(String));
  const [complete, setComplete] = useState(() => completeField(thresholds, completeXp));
  const pending = saving || resetting;

  // Follow the server after a save or reset without remounting (the message stays visible).
  const signature = `${custom}:${thresholds.join(",")}:${completeXp}`;
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setValues(thresholds.map(String));
    setComplete(completeField(thresholds, completeXp));
  }

  const count = values.length;
  const numbers = values.map(Number);
  const automatic = numbers.every((n) => Number.isFinite(n)) ? defaultCompleteXp(numbers) : null;
  const above = Object.entries(studentsByLevel)
    .filter(([level]) => Number(level) > count)
    .reduce((sum, [, n]) => sum + n, 0);

  function setCount(next: number) {
    setValues((prev) => {
      if (next <= prev.length) return prev.slice(0, next);
      const added = Array.from({ length: next - prev.length }, (_, i) => {
        const level = prev.length + i;
        // A sensible start: the school's value, or the last one plus a step.
        const last = Number(prev.at(-1)) || 0;
        return String(Math.max(schoolThresholds[level] ?? 0, last + 10 * (i + 1)));
      });
      return [...prev, ...added];
    });
  }

  function reset() {
    start(async () => {
      setResetState(await resetClassLevelsAction(classId));
    });
  }

  return (
    <form action={formAction} onSubmit={() => setResetState(null)} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Seviye sayısı</legend>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              aria-pressed={count === n}
              className={cn(
                "flex min-h-11 min-w-14 items-center justify-center rounded-md border-2 px-4 font-semibold transition-colors",
                count === n ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={pending}>
        <legend className="sr-only">Seviye eşikleri</legend>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {values.map((value, i) => (
            <li key={i} className="flex flex-col gap-2">
              <Label htmlFor={`class-threshold-${i}`}>{i + 1}. seviye</Label>
              {i === 0 ? (
                <>
                  <input type="hidden" name="threshold" value={0} />
                  <Input id={`class-threshold-${i}`} value="0 XP" disabled />
                </>
              ) : (
                <Input
                  id={`class-threshold-${i}`}
                  name="threshold"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={value}
                  onChange={(e) => setValues((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  required
                />
              )}
              {exampleStages[i] && <span className="text-xs text-muted-foreground">ör. {exampleStages[i]}</span>}
            </li>
          ))}
        </ol>
      </fieldset>

      <fieldset className="flex max-w-xs flex-col gap-2" disabled={pending}>
        <Label htmlFor="class-complete-xp">Yeni karaktere geçiş (XP)</Label>
        <Input
          id="class-complete-xp"
          name="completeXp"
          type="number"
          inputMode="numeric"
          min={1}
          value={complete}
          onChange={(e) => setComplete(e.target.value)}
          placeholder={automatic === null ? "Otomatik" : `Otomatik: ${automatic}`}
        />
        <span className="text-xs text-muted-foreground">
          Öğrenci bir karakterde bu XP&apos;ye ulaşınca karakteri tamamlanır ve sıradaki karakterin ilk aşamasına geçer;
          son karakterden sonra ilk karaktere döner. Son seviyenin eşiğinden büyük olmalıdır. Boş bırakırsanız son
          aşama, bir önceki aşama kadar sürer.
        </span>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Eşik, karakterin o seviyeye ulaşması için gereken XP&apos;dir ve tüm türler için ortaktır. Eşikleri düşürmek yeni
        eşiğe ulaşan öğrencileri hemen yükseltir; yükseltmek ya da seviye sayısını azaltmak kimsenin seviyesini düşürmez.
      </p>
      {above > 0 && (
        <p role="status" className="rounded-md bg-sun-soft p-3 text-sm">
          {above} öğrenci şu an {count}. seviyenin üstünde. Bu öğrenciler seviyelerini korur ve en yüksek seviyede görünür.
        </p>
      )}
      <FormMessage state={resetState ?? state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Seviyeleri kaydet
        </Button>
        {custom && (
          <Button type="button" variant="outline" disabled={pending} onClick={reset}>
            Okul ayarına dön
          </Button>
        )}
      </div>
    </form>
  );
}
