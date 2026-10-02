"use client";

import { useTransition } from "react";
import { loadDefaultBehaviorTypesAction } from "@/app/ogretmen/behavior-type-actions";
import { Button } from "@/components/ui/button";
import { DEFAULT_BEHAVIORS } from "@/content/default-behaviors";

export function LoadDefaultsButton({ classId }: { classId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="h-11"
      disabled={pending}
      onClick={() => start(async () => void (await loadDefaultBehaviorTypesAction(classId)))}
    >
      Sınıfınız için hazır {DEFAULT_BEHAVIORS.length} davranış var · Yükle
    </Button>
  );
}
