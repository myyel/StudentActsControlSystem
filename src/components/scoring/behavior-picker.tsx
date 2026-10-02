"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BehaviorTile } from "@/components/behaviors/behavior-tile";
import { CharacterAvatar } from "@/components/characters/character-avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type PickerBehavior = { id: string; name: string; icon: string; points: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One student: the character in the header shows the teacher they opened the right one. */
  stage?: { name: string; assetUrl: string };
  detailHref?: string;
  behaviors: PickerBehavior[];
  pending: boolean;
  error: string | null;
  onPick: (behaviorId: string, note: string) => void;
};

/** Second tap of "tap card → tap behavior". Positive first; negatives apart as "gelişim alanı". */
export function BehaviorPicker({ open, onOpenChange, title, stage, detailHref, behaviors, pending, error, onPick }: Props) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const positive = behaviors.filter((b) => b.points > 0);
  const negative = behaviors.filter((b) => b.points < 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setShowNote(false);
          setNote("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl bg-card sm:max-w-2xl">
        <DialogHeader className="flex-row items-center gap-3 px-0 text-left">
          {stage && <CharacterAvatar stage={stage} size={52} className="rounded-full bg-grass-soft" />}
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="font-display text-2xl font-extrabold">{title}</DialogTitle>
            <DialogDescription>{stage ? stage.name : "Seçili öğrencilere aynı davranış verilir."}</DialogDescription>
          </div>
        </DialogHeader>

        {behaviors.length === 0 ? (
          <p>Bu sınıfta aktif okul davranışı yok. Davranışlar sayfasından ekleyin.</p>
        ) : (
          <>
            {positive.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-extrabold tracking-wide text-grass-strong uppercase">Olumlu</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {positive.map((b) => (
                    <BehaviorTile key={b.id} {...b} tone="adult" disabled={pending} onClick={() => onPick(b.id, note)} />
                  ))}
                </div>
              </section>
            )}
            {negative.length > 0 && (
              <section className="mt-2 flex flex-col gap-2">
                <h3 className="text-xs font-extrabold tracking-wide text-coral-ink">
                  GELİŞİM ALANI <span className="font-semibold normal-case">· yalnızca siz ve veli görür</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {negative.map((b) => (
                    <BehaviorTile key={b.id} {...b} tone="negative" disabled={pending} onClick={() => onPick(b.id, note)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {showNote ? (
          <Textarea
            aria-label="Not (veliye gösterilmez)"
            placeholder="Not (veliye gösterilmez), ardından davranışı seçin"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-3 text-left text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            <Lock className="size-4" aria-hidden />
            Not ekle (veliye gösterilmez)
          </button>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {detailHref ? (
            <Link href={detailHref} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
              Öğrenci detayı ve zaman çizelgesi
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">Puan hemen kaydedilir · 10 sn geri alınabilir</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
