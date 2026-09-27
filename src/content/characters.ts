// Built-in character types. Pictures are original placeholder SVGs in public/characters/<slug>/<level>.svg.

export type CharacterTemplate = { slug: string; name: string; stages: readonly string[] };

export const CHARACTER_TEMPLATES: readonly CharacterTemplate[] = [
  { slug: "ejderha", name: "Ejderha", stages: ["Benekli yumurta", "Çatlayan yumurta", "Yavru ejderha", "Kanatlı ejderha", "Bilge ejderha"] },
  { slug: "baykus", name: "Baykuş", stages: ["Benekli yumurta", "Tüylü yavru", "Küçük baykuş", "Dal üstünde baykuş", "Bilge baykuş"] },
  { slug: "robot", name: "Robot", stages: ["Minik dişli", "Kutu robot", "Antenli robot", "Yürüyen robot", "Uçan robot"] },
  { slug: "tohum", name: "Tohum", stages: ["Tohum", "Filiz", "Fidan", "Genç ağaç", "Meyveli ağaç"] },
];

export const stageAssetUrl = (slug: string, level: number) => `/characters/${slug}/${level}.svg`;
