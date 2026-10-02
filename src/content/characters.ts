// Built-in character types. Pictures are original SVGs in public/characters/<slug>/<level>.svg, drawn by
// scripts/characters/generate.mjs: every level adds a visible part, level 5 is ringed with stars.

export type CharacterTemplate = { slug: string; name: string; stages: readonly string[] };

export const CHARACTER_TEMPLATES: readonly CharacterTemplate[] = [
  { slug: "ejderha", name: "Ejderha", stages: ["Gizemli yumurta", "Çatlayan yumurta", "Yavru ejderha", "Kanatlı ejderha", "Bilge ejderha"] },
  { slug: "baykus", name: "Baykuş", stages: ["Benekli yumurta", "Pofuduk yavru", "Meraklı baykuş", "Kitapsever baykuş", "Bilge baykuş"] },
  { slug: "robot", name: "Robot", stages: ["Parça kutusu", "Mini robot", "Yardımcı robot", "Kalpli robot", "Süper robot"] },
  { slug: "tohum", name: "Tohum", stages: ["Tohum", "Filiz", "Fidan", "Genç ağaç", "Çiçekli ağaç"] },
];

export const stageAssetUrl = (slug: string, level: number) => `/characters/${slug}/${level}.svg`;
