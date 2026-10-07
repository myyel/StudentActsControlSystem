import { CharacterAvatar } from "./character-avatar";
import { CharacterImage } from "./character-image";
import { CompletedCharacters, type CompletedCharacter } from "./completed-characters";
import { LevelBar } from "./level-bar";

type Props = {
  character: {
    level: number;
    maxLevel: number;
    /** XP on the current character. */
    xp: number;
    progress: number;
    /** XP of the next level, or on the last level of the next character. */
    nextThreshold: number;
    stage: { name: string; assetUrl: string };
    nextCharacter: { name: string; assetUrl: string } | null;
    completed: CompletedCharacter[];
  };
};

/**
 * Teacher view of a student's character. Nobody picks the type: students start with the class's
 * first character and move through the class's order as they finish each one (PRD §4.6).
 */
export function StudentCharacter({ character }: Props) {
  const { level, maxLevel, xp, nextThreshold, stage, progress, nextCharacter, completed } = character;
  const lastLevel = level >= maxLevel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <CharacterAvatar stage={stage} level={level} maxLevel={maxLevel} progress={progress} size={152} label={`${stage.name}, ${level}. seviye`} />
        <div className="flex w-full flex-col gap-2">
          <p className="text-xl font-semibold">{stage.name}</p>
          <p className="text-muted-foreground">{level}. seviye</p>
          <LevelBar level={level} maxLevel={maxLevel} progress={progress} />
          <p className="text-sm text-muted-foreground">
            {lastLevel
              ? `Son aşamada. ${nextThreshold} XP'de yeni karaktere geçer (bu karakterde şu an ${xp} XP).`
              : `Sonraki seviye ${nextThreshold} XP'de (bu karakterde şu an ${xp} XP).`}
          </p>
        </div>
      </div>

      {nextCharacter && (
        <p className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
          <CharacterImage stage={{ name: nextCharacter.name, assetUrl: nextCharacter.assetUrl }} size={44} decorative />
          <span>
            Sıradaki karakter: <strong>{nextCharacter.name}</strong>. Sırayı sınıfın Karakterler sekmesinden
            değiştirebilirsiniz.
          </span>
        </p>
      )}

      <CompletedCharacters items={completed} />
    </div>
  );
}
