"use client";

import { useActionState, useRef } from "react";
import { addStudentAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradeLevelSelect } from "./grade-level-select";

export function AddStudentForm({ classId, gradeLevels }: { classId: string; gradeLevels: number[] }) {
  const combined = gradeLevels.length > 1;
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await addStudentAction(classId, prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, null);

  return (
    <form ref={formRef} action={action} className={combined ? "grid gap-4 sm:grid-cols-[1fr_7rem_8rem_auto] sm:items-end" : "grid gap-4 sm:grid-cols-[1fr_7rem_auto] sm:items-end"}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-first-name">Ad</Label>
        <Input id="student-first-name" name="firstName" required maxLength={50} className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="student-last-initial">Soyad baş harfi</Label>
        <Input id="student-last-initial" name="lastInitial" maxLength={1} className="h-11" />
      </div>
      <GradeLevelSelect id="student-grade" gradeLevels={gradeLevels} label="Düzey" />
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Ekleniyor…" : "Ekle"}
      </Button>
      <div className={combined ? "sm:col-span-4" : "sm:col-span-3"}>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
