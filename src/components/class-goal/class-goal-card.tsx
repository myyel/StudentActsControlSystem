"use client";

import { useActionState, useState, useTransition } from "react";
import { endClassGoalAction, setClassGoalAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClassGoalView } from "@/server/services/class-goal";
import { ClassGoalBar } from "./class-goal-bar";

/**
 * Teacher sets the shared goal and its reward ("100 ⭐ = bahçe oyunu"). The app only counts;
 * the reward is the teacher's call in class.
 */
export function ClassGoalCard({ classId, goal }: { classId: string; goal: ClassGoalView | null }) {
  const [state, action, pending] = useActionState(setClassGoalAction.bind(null, classId), null);
  const [editing, setEditing] = useState(goal === null);
  const [ending, startEnding] = useTransition();

  return (
    <section aria-labelledby="class-goal-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="class-goal-title" className="font-display text-xl font-extrabold">
          Sınıf hedefi
        </h2>
        {goal && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={() => setEditing(!editing)} aria-expanded={editing}>
              Yeni hedef
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              disabled={ending}
              onClick={() => startEnding(async () => void (await endClassGoalAction(classId)))}
            >
              Hedefi bitir
            </Button>
          </div>
        )}
      </div>
      {goal ? (
        <ClassGoalBar {...goal} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Her olumlu puan ortak çubuğu doldurur; olumsuz puanlar düşürmez. Tahta modunda görünür.
        </p>
      )}
      {editing && (
        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="goal-title">Ödül</Label>
            <Input id="goal-title" name="title" required maxLength={60} placeholder="Bahçe oyunu" className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-36">
            <Label htmlFor="goal-target">Kaç yıldız?</Label>
            <Input id="goal-target" name="target" type="number" min={5} max={1000} defaultValue={100} required className="h-11" />
          </div>
          <Button type="submit" className="h-11" disabled={pending}>
            {goal ? "Yeni hedefi başlat" : "Hedef koy"}
          </Button>
        </form>
      )}
      <FormMessage state={state} />
    </section>
  );
}
