import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { characterTone } from "@/components/characters/character-avatar";
import { CHARACTER_TEMPLATES, stageAssetUrl } from "@/content/characters";
import { characterNoun, MAX_LEVEL } from "@/lib/character";

describe("built-in character templates", () => {
  it("has ten types, each with five named stages and their pictures", () => {
    expect(CHARACTER_TEMPLATES).toHaveLength(10);
    expect(new Set(CHARACTER_TEMPLATES.map((t) => t.slug)).size).toBe(10);
    for (const t of CHARACTER_TEMPLATES) {
      expect(t.stages).toHaveLength(MAX_LEVEL);
      for (let level = 1; level <= MAX_LEVEL; level++) {
        expect(existsSync(join(process.cwd(), "public", stageAssetUrl(t.slug, level))), `${t.slug}/${level}`).toBe(true);
      }
    }
  });

  it("gives every type its own possessive and ring colour", () => {
    for (const t of CHARACTER_TEMPLATES) {
      const url = stageAssetUrl(t.slug, 1);
      expect(characterNoun(url), t.slug).not.toBe("karakteri");
      expect(characterTone(url), t.slug).not.toBe("#079669");
    }
    expect(characterNoun(stageAssetUrl("kaplumbaga", 3))).toBe("kaplumbağası");
  });
});
