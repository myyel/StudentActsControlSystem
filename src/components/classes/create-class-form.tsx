"use client";

import { useActionState } from "react";
import { createClassAction } from "@/app/ogretmen/actions";
import { FormMessage, selectClassName } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClassForm({ defaultAcademicYear }: { defaultAcademicYear: string }) {
  const [state, action, pending] = useActionState(createClassAction, null);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="class-name">Sınıf adı</Label>
        <Input id="class-name" name="name" placeholder="Örn. 2-A" required maxLength={40} className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="class-grade">Sınıf düzeyi</Label>
        <select id="class-grade" name="gradeLevel" defaultValue="1" className={selectClassName}>
          {[1, 2, 3, 4].map((g) => (
            <option key={g} value={g}>
              {g}. sınıf
            </option>
          ))}
        </select>
      </div>
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
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Oluşturuluyor…" : "Sınıf oluştur"}
      </Button>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
