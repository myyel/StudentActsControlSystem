"use client";

import { useTransition } from "react";
import { setNodeArchivedAction } from "@/app/ogretmen/curriculum-actions";
import { Button } from "@/components/ui/button";
import type { ArchivedNode } from "@/server/services/curriculum";

const LABEL = { subject: "Ders", topic: "Konu", stage: "Durak" } as const;

export function ArchivedList({ nodes }: { nodes: ArchivedNode[] }) {
  const [pending, start] = useTransition();
  return (
    <ul className="flex flex-col divide-y">
      {nodes.map((n) => (
        <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>
            <span className="text-sm text-muted-foreground">{LABEL[n.kind]}: </span>
            {n.path && <span className="text-sm text-muted-foreground">{n.path} › </span>}
            {n.name}
          </span>
          <Button
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => start(async () => void (await setNodeArchivedAction(n.kind, n.id, false)))}
          >
            Geri al
          </Button>
        </li>
      ))}
    </ul>
  );
}
