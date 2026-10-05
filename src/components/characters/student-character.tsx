"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setStudentCharacterTypeAction } from "@/app/ogretmen/actions";
import { FormMessage } from "@/components/form-message";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";
import { CharacterAvatar } from "./character-avatar";
import { CharacterImage } from "./character-image";
import { LevelBar } from "./level-bar";

type Props = {
  studentId: string;
  /** Board link that opens "hangisi seninle büyüsün?" for this student. */
  boardHref: string;
  character: {
    characterTypeId: string;
    level: number;
    maxLevel: number;
    xp: number;
    progress: number;
    nextThreshold: number | null;
    stage: { name: string; assetUrl: string };
    types: { id: string; name: string; assetUrl: string }[];
  };
};

/** Teacher view of a student's character; the type can be changed, the level stays. */
export function StudentCharacter({ studentId, boardHref, character }: Props) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult<undefined> | null>(null);
  const { level, maxLevel, xp, nextThreshold, stage, progress, types, characterTypeId } = character;

  function choose(typeId: string) {
    if (typeId === characterTypeId) return;
    start(async () => setState(await setStudentCharacterTypeAction(studentId, typeId)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <CharacterAvatar stage={stage} level={level} maxLevel={maxLevel} progress={progress} size={152} label={`${stage.name}, ${level}. seviye`} />
        <div className="flex w-full flex-col gap-2">
          <p className="text-xl font-semibold">{stage.name}</p>
          <p className="text-muted-foreground">{level}. seviye</p>
          <LevelBar level={level} maxLevel={maxLevel} progress={progress} />
          <p className="text-sm text-muted-foreground">
            {nextThreshold === null
              ? "Son seviyeye ulaştı."
              : `Sonraki seviye ${nextThreshold} XP'de (şu an ${xp} XP).`}
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Karakter türü (seviye korunur)</legend>
        <p className="mb-2 text-sm text-muted-foreground">
          Çocuk isterse türü tahtada birlikte seçin:{" "}
          <Link href={boardHref} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
            Tahtada birlikte seç
          </Link>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              aria-pressed={t.id === characterTypeId}
              className={cn(
                "flex min-h-11 flex-col items-center gap-1 rounded-lg border p-2 text-sm font-medium transition-colors",
                t.id === characterTypeId ? "border-primary bg-primary/10" : "hover:bg-accent",
              )}
            >
              <CharacterImage stage={{ name: t.name, assetUrl: t.assetUrl }} size={64} decorative />
              {t.name}
            </button>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
    </div>
  );
}
