"use client";

import { useRouter } from "next/navigation";

type Props = { currentId: string; tabPath: string; classes: { id: string; name: string }[] };

/** Jumps to the same tab of another class (teachers with several sections). */
export function ClassSwitcher({ currentId, tabPath, classes }: Props) {
  const router = useRouter();
  return (
    <select
      aria-label="Sınıf değiştir"
      value={currentId}
      onChange={(e) => router.push(`/ogretmen/siniflar/${e.target.value}${tabPath}`)}
      className="min-h-11 rounded-xl border bg-card px-3 text-sm font-bold"
    >
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
