"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { createClassAction } from "@/app/ogretmen/actions";
import { FormMessage, selectClassName } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRADE_LEVELS } from "@/lib/grade-levels";
import { cn } from "@/lib/utils";

const KINDS = [
  { combined: false, title: "Tek düzey", hint: "Bütün öğrenciler aynı sınıf düzeyinde (ör. 2-A)." },
  { combined: true, title: "Birleştirilmiş sınıf", hint: "Farklı düzeyler aynı sınıfta (ör. 1-2 ya da 1-2-3-4)." },
] as const;

export function CreateClassForm({ defaultAcademicYear }: { defaultAcademicYear: string }) {
  const [state, action, pending] = useActionState(createClassAction, null);
  const [combined, setCombined] = useState(false);
  const [levels, setLevels] = useState<number[]>([1, 2]);

  const toggle = (level: number) =>
    setLevels((current) => (current.includes(level) ? current.filter((l) => l !== level) : [...current, level].sort()));

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Sınıf türü</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map((kind) => (
            <label
              key={kind.title}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition-colors",
                combined === kind.combined ? "border-sky bg-sky-soft" : "border-input bg-card hover:bg-accent",
              )}
            >
              <input
                type="radio"
                name="kind"
                checked={combined === kind.combined}
                onChange={() => setCombined(kind.combined)}
                className="mt-1 size-4 accent-sky-ink"
              />
              <span className="flex flex-col">
                <span className="font-bold">{kind.title}</span>
                <span className="text-sm text-muted-foreground">{kind.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {combined && <input type="hidden" name="combined" value="on" />}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_9rem] sm:items-start">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class-name">Sınıf adı</Label>
          <Input
            id="class-name"
            name="name"
            placeholder={combined ? "Örn. Birleştirilmiş 1-2" : "Örn. 2-A"}
            required
            maxLength={40}
            className="h-11"
          />
        </div>

        {combined ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Düzeyler (en az iki)</legend>
            <div className="flex gap-2">
              {GRADE_LEVELS.map((level) => {
                const on = levels.includes(level);
                return (
                  <label
                    key={level}
                    className={cn(
                      "relative flex size-11 cursor-pointer items-center justify-center rounded-xl border-2 font-display text-lg font-extrabold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
                      on ? "border-grass-strong bg-grass-soft text-grass-strong" : "border-input bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="gradeLevels"
                      value={level}
                      checked={on}
                      onChange={() => toggle(level)}
                      className="sr-only"
                      aria-label={`${level}. sınıf`}
                    />
                    {level}
                    {on && <Check aria-hidden className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-grass-strong p-0.5 text-white" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-grade">Sınıf düzeyi</Label>
            <select id="class-grade" name="gradeLevels" defaultValue="1" className={selectClassName}>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}. sınıf
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="class-year">Öğretim yılı</Label>
          <Input
            id="class-year"
            name="academicYear"
            defaultValue={defaultAcademicYear}
            required
            pattern="\d{4}-\d{4}"
            className="h-11"
          />
        </div>
      </div>

      {combined && (
        <p className="rounded-2xl bg-sun-soft px-4 py-3 text-sm">
          Birleştirilmiş sınıfta öğrencileri eklerken her birinin düzeyini seçersiniz. Puanlama ekranında düzeye göre
          süzebilir, dersleri bir düzeye bağlayabilirsiniz.
        </p>
      )}

      <Button type="submit" disabled={pending || (combined && levels.length < 2)} className="h-11 self-start px-6">
        {pending ? "Oluşturuluyor…" : "Sınıf oluştur"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
