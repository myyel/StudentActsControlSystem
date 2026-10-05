import { CharacterAvatar } from "@/components/characters/character-avatar";
import { LevelBar } from "@/components/characters/level-bar";

type Props = {
  childName: string;
  className: string;
  character: {
    level: number;
    maxLevel: number;
    xp: number;
    progress: number;
    nextThreshold: number | null;
    nextStageName: string | null;
    stage: { name: string; assetUrl: string };
  };
};

/**
 * Top of the parent dashboard, looked at together with the child: big character and ring
 * (child surface); the parent also gets the number to the next stage.
 */
export function CharacterHero({ childName, className, character }: Props) {
  const { level, maxLevel, xp, progress, nextThreshold, nextStageName, stage } = character;
  return (
    <section
      aria-label="Karakter"
      className="flex flex-col items-center gap-3 rounded-[2rem] bg-linear-to-b from-grass-soft to-card p-6 text-center shadow-[0_4px_0_var(--kid-shadow)] sm:flex-row sm:text-left"
    >
      <CharacterAvatar stage={stage} level={level} maxLevel={maxLevel} progress={progress} size={168} className="sm:[--avatar:184px]" />
      <div className="flex w-full min-w-0 flex-col gap-2">
        <p className="font-display text-3xl leading-tight font-extrabold">{stage.name}</p>
        <p className="font-semibold text-muted-foreground">
          {level}. seviye · {className}
        </p>
        <LevelBar level={level} maxLevel={maxLevel} progress={progress} className="h-4" label={`${childName}: ${stage.name}`} />
        <p className="text-sm">
          {nextThreshold === null || nextStageName === null ? (
            "Son seviyeye ulaştı!"
          ) : (
            <>
              {nextStageName} olmaya <strong>{Math.max(0, nextThreshold - xp)} XP</strong> kaldı · şu an {xp} XP
            </>
          )}
        </p>
      </div>
    </section>
  );
}
