"use client";

import { useActionState, useTransition } from "react";
import { setStudentActiveAction, updateStudentAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradeLevelSelect } from "./grade-level-select";

type Props = {
  studentId: string;
  firstName: string;
  lastInitial: string | null;
  gradeLevel: number;
  /** The grade field only appears in combined classes. */
  classGradeLevels: number[];
  active: boolean;
};

export function StudentEditForm({ studentId, firstName, lastInitial, gradeLevel, classGradeLevels, active }: Props) {
  const combined = classGradeLevels.length > 1;
  const [state, action, pending] = useActionState(updateStudentAction.bind(null, studentId), null);
  const [togglePending, startToggle] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className={combined ? "grid gap-4 sm:grid-cols-[1fr_7rem_8rem_auto] sm:items-end" : "grid gap-4 sm:grid-cols-[1fr_7rem_auto] sm:items-end"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-first-name">Ad</Label>
          <Input
            id="edit-first-name"
            name="firstName"
            defaultValue={firstName}
            required
            maxLength={50}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-last-initial">Soyad baş harfi</Label>
          <Input
            id="edit-last-initial"
            name="lastInitial"
            defaultValue={lastInitial ?? ""}
            maxLength={1}
            className="h-11"
          />
        </div>
        <GradeLevelSelect id="edit-grade" gradeLevels={classGradeLevels} defaultValue={gradeLevel} label="Düzey" />
        <Button type="submit" disabled={pending} className="h-11">
          Kaydet
        </Button>
      </form>
      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {active ? "Öğrenci aktif." : "Öğrenci pasif; puanlama ekranlarında görünmez."}
        </span>
        <Button
          variant="outline"
          className="h-11"
          disabled={togglePending}
          onClick={() =>
            startToggle(async () => {
              await setStudentActiveAction(studentId, !active);
            })
          }
        >
          {active ? "Pasif yap" : "Aktif yap"}
        </Button>
      </div>
    </div>
  );
}
