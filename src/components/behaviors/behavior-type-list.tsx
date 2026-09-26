"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import {
  moveBehaviorTypeAction,
  setBehaviorTypeActiveAction,
  updateBehaviorTypeAction,
} from "@/app/ogretmen/behavior-type-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import type { BehaviorScope } from "@/server/db/schema";
import { BehaviorTypeForm } from "./behavior-type-form";

type Item = { id: string; name: string; icon: string; points: number; active: boolean };

export function BehaviorTypeList({ items, scope }: { items: Item[]; scope: BehaviorScope }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (items.length === 0) return <p className="text-muted-foreground">Bu listede davranış yok.</p>;

  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {items.map((item, index) => (
        <li key={item.id} className={cn("flex flex-col gap-3 p-3", !item.active && "bg-muted/50")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
            <span className={cn("min-w-0 flex-1 font-medium", !item.active && "text-muted-foreground")}>
              {item.name}
            </span>
            <Badge variant={item.points > 0 ? "default" : "destructive"}>{formatPoints(item.points)}</Badge>
            {!item.active && <Badge variant="secondary">Pasif</Badge>}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`${item.name} yukarı taşı`}
                disabled={pending || index === 0}
                onClick={() => start(async () => void (await moveBehaviorTypeAction(item.id, "up")))}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`${item.name} aşağı taşı`}
                disabled={pending || index === items.length - 1}
                onClick={() => start(async () => void (await moveBehaviorTypeAction(item.id, "down")))}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setEditing(editing === item.id ? null : item.id)}
                aria-expanded={editing === item.id}
              >
                Düzenle
              </Button>
              <Button
                variant="outline"
                className="h-11"
                disabled={pending}
                onClick={() => start(async () => void (await setBehaviorTypeActiveAction(item.id, !item.active)))}
              >
                {item.active ? "Pasif yap" : "Aktif yap"}
              </Button>
            </div>
          </div>
          {editing === item.id && (
            <div className="rounded-md border bg-background p-3">
              <BehaviorTypeForm
                scope={scope}
                action={updateBehaviorTypeAction.bind(null, item.id)}
                initial={item}
                submitLabel="Kaydet"
                onDone={() => setEditing(null)}
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Puanı değiştirmek daha önce verilmiş puanları etkilemez.
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
