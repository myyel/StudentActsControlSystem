import { cn } from "@/lib/utils";
import { CharacterImage } from "./character-image";

export type CompletedCharacter = { id: string; typeName: string; stage: { name: string; assetUrl: string } };

/**
 * The characters a student finished, oldest first, each as its last stage. Shown to the teacher
 * and the parent only: on the board it would turn into a comparison between children.
 */
export function CompletedCharacters({ items, className }: { items: CompletedCharacter[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm font-bold">Tamamlanan karakterler ({items.length})</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-sun-soft px-2 py-1.5 text-xs font-semibold"
          >
            <CharacterImage stage={c.stage} size={48} decorative />
            {c.typeName}
          </li>
        ))}
      </ul>
    </div>
  );
}
