"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatPoints } from "@/lib/behavior";
import { cn } from "@/lib/utils";

export type PickerBehavior = { id: string; name: string; icon: string; points: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  detailHref?: string;
  behaviors: PickerBehavior[];
  pending: boolean;
  error: string | null;
  onPick: (behaviorId: string, note: string) => void;
};

/** Second tap of "tap card → tap behavior". */
export function BehaviorPicker({ open, onOpenChange, title, detailHref, behaviors, pending, error, onPick }: Props) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const positive = behaviors.filter((b) => b.points > 0);
  const negative = behaviors.filter((b) => b.points < 0);

  const group = (label: string, items: PickerBehavior[], tone: "positive" | "negative") =>
    items.length > 0 && (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={pending}
              onClick={() => onPick(b.id, note)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors disabled:opacity-50",
                tone === "positive"
                  ? "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  : "hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {b.icon}
              </span>
              <span className="text-sm leading-tight font-medium">{b.name}</span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  tone === "positive" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                )}
              >
                {formatPoints(b.points)}
              </span>
            </button>
          ))}
        </div>
      </section>
    );

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>Bir davranış seçin; puan hemen kaydedilir ve 10 saniye içinde geri alınabilir.</DialogDescription>
        </DialogHeader>

        {behaviors.length === 0 ? (
          <p>Bu sınıfta aktif okul davranışı yok. Davranışlar sayfasından ekleyin.</p>
        ) : (
          <>
            {group("Olumlu", positive, "positive")}
            {group("Olumsuz", negative, "negative")}
          </>
        )}

        {showNote ? (
          <Textarea
            aria-label="Not (isteğe bağlı)"
            placeholder="Not (isteğe bağlı), ardından davranışı seçin"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
          />
        ) : (
          <Button variant="ghost" className="h-11 self-start" onClick={() => setShowNote(true)}>
            Not ekle
          </Button>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {detailHref && (
          <Link href={detailHref} className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline underline-offset-2">
            Öğrenci detayı ve zaman çizelgesi
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
