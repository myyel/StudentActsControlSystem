// Built-in character types. Pictures are original SVGs in public/characters/<slug>/<level>.svg, drawn by
// scripts/characters/generate.mjs: every level adds a visible part, level 5 is ringed with stars.

export type CharacterTemplate = { slug: string; name: string; stages: readonly string[] };

export const CHARACTER_TEMPLATES: readonly CharacterTemplate[] = [
  { slug: "ejderha", name: "Ejderha", stages: ["Gizemli yumurta", "Çatlayan yumurta", "Yavru ejderha", "Kanatlı ejderha", "Bilge ejderha"] },
  { slug: "baykus", name: "Baykuş", stages: ["Benekli yumurta", "Pofuduk yavru", "Meraklı baykuş", "Kitapsever baykuş", "Bilge baykuş"] },
  { slug: "robot", name: "Robot", stages: ["Parça kutusu", "Mini robot", "Yardımcı robot", "Kalpli robot", "Süper robot"] },
  { slug: "tohum", name: "Tohum", stages: ["Tohum", "Filiz", "Fidan", "Genç ağaç", "Çiçekli ağaç"] },
  { slug: "kedi", name: "Kedi", stages: ["Sepetteki yavru", "Minik kedi", "Oyuncu kedi", "Fiyonklu kedi", "Bilge kedi"] },
  { slug: "tavsan", name: "Tavşan", stages: ["Yuvadaki yavru", "Pamuk yavru", "Zıpzıp tavşan", "Çiçekli tavşan", "Bilge tavşan"] },
  { slug: "penguen", name: "Penguen", stages: ["Buzlu yumurta", "Pofuduk yavru", "Meraklı penguen", "Atkılı penguen", "Kral penguen"] },
  { slug: "tilki", name: "Tilki", stages: ["Yapraklı yuva", "Yavru tilki", "Çevik tilki", "Kaşif tilki", "Bilge tilki"] },
  { slug: "kaplumbaga", name: "Kaplumbağa", stages: ["Kumdaki yumurta", "Minik kaplumbağa", "Yürüyen kaplumbağa", "Çiçekli kaplumbağa", "Bilge kaplumbağa"] },
  { slug: "ahtapot", name: "Ahtapot", stages: ["Deniz kabuğu", "Minik ahtapot", "Neşeli ahtapot", "Dalgıç ahtapot", "Bilge ahtapot"] },
];

export const stageAssetUrl = (slug: string, level: number) => `/characters/${slug}/${level}.svg`;
