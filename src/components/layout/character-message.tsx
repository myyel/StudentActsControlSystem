import { CharacterImage } from "@/components/characters/character-image";
import { stageAssetUrl } from "@/content/characters";

type Props = {
  /** A built-in character picture, e.g. ["robot", 2]. */
  character: [slug: string, level: number];
  title: string;
  children: React.ReactNode;
  /** The one way out of the screen. */
  action: React.ReactNode;
  /** Heading level: pages use h1, cards inside a page h2. */
  as?: "h1" | "h2";
  extra?: React.ReactNode;
};

/** Error and empty screens talk through a character: same facts, a warmer tone, one exit. */
export function CharacterMessage({ character: [slug, level], title, children, action, as: Heading = "h1", extra }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <CharacterImage stage={{ name: "", assetUrl: stageAssetUrl(slug, level) }} size={160} decorative />
        {extra}
      </div>
      <Heading className="font-display text-3xl font-extrabold">{title}</Heading>
      <div className="max-w-sm text-muted-foreground">{children}</div>
      {action}
    </div>
  );
}

export const primaryAction =
  "inline-flex min-h-11 items-center rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90";
