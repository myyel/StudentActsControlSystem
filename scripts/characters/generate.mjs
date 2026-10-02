// Draws the original character set into public/characters/<slug>/<level>.svg.
// Rule (docs/Cocuk-Odakli-Arayuz-Onerileri.pdf): every level adds a part that is visible at a glance;
// level 5 is ringed with stars. Names must match src/content/characters.ts.
// Run: node scripts/characters/generate.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../public/characters");
const INK = "#2b2d42";

const TYPES = {
  ejderha: { name: "Ejderha", bg: "#e3f7e8", stages: ["Gizemli yumurta", "Çatlayan yumurta", "Yavru ejderha", "Kanatlı ejderha", "Bilge ejderha"] },
  baykus: { name: "Baykuş", bg: "#fceedc", stages: ["Benekli yumurta", "Pofuduk yavru", "Meraklı baykuş", "Kitapsever baykuş", "Bilge baykuş"] },
  robot: { name: "Robot", bg: "#e2f0ff", stages: ["Parça kutusu", "Mini robot", "Yardımcı robot", "Kalpli robot", "Süper robot"] },
  tohum: { name: "Tohum", bg: "#eaf6df", stages: ["Tohum", "Filiz", "Fidan", "Genç ağaç", "Çiçekli ağaç"] },
};

// ---- shared parts -------------------------------------------------------------------------------

const eye = (x, y, r = 9) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.15}" cy="${y + r * 0.1}" r="${r * 0.6}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.25}" r="${r * 0.22}" fill="#fff"/>`;
const eyes = (cx, y, dx, r) => eye(cx - dx, y, r) + eye(cx + dx, y, r);
const smile = (cx, y, w = 7) =>
  `<path d="M${cx - w} ${y} Q${cx} ${y + w * 0.8} ${cx + w} ${y}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
const cheeks = (cx, y, dx, color = "#ff9fb0") =>
  `<ellipse cx="${cx - dx}" cy="${y}" rx="6" ry="4" fill="${color}" opacity=".7"/><ellipse cx="${cx + dx}" cy="${y}" rx="6" ry="4" fill="${color}" opacity=".7"/>`;
const shadow = (rx = 52) => `<ellipse cx="100" cy="180" rx="${rx}" ry="7" fill="#000" opacity=".08"/>`;

function star(x, y, r, fill = "#ffc83d") {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="#e0a400" stroke-width="1.5" stroke-linejoin="round"/>`;
}
const stars = () => star(30, 44, 11) + star(170, 40, 9) + star(26, 130, 7) + star(174, 124, 8);
const gear = (x, y, r, color) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="${r * 0.5}" stroke-dasharray="${(r * 0.5).toFixed(1)} ${(r * 0.45).toFixed(1)}"/><circle cx="${x}" cy="${y}" r="${r * 0.72}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${r * 0.28}" fill="#fff"/>`;
const heart = (x, y, s, fill = "#ff6b6b") =>
  `<path d="M${x} ${y + s * 0.9} C${x - s * 1.4} ${y} ${x - s * 0.8} ${y - s} ${x} ${y - s * 0.35} C${x + s * 0.8} ${y - s} ${x + s * 1.4} ${y} ${x} ${y + s * 0.9}Z" fill="${fill}"/>`;

// ---- dragon -------------------------------------------------------------------------------------

const D = { body: "#3dbb6b", dark: "#2a9a52", belly: "#c9f0d3", light: "#a8e6bb", wing: "#86dca2" };

function dragonBody(level) {
  let s = "";
  if (level >= 4)
    s += `<path d="M70 120 C40 96 22 104 18 126 C30 122 34 132 44 128 C46 138 58 140 66 134Z" fill="${D.wing}" stroke="${D.dark}" stroke-width="3" stroke-linejoin="round"/><path d="M130 120 C160 96 178 104 182 126 C170 122 166 132 156 128 C154 138 142 140 134 134Z" fill="${D.wing}" stroke="${D.dark}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M128 150 C156 158 170 140 164 124 C176 146 160 170 126 164Z" fill="${D.body}"/>`;
  s += `<ellipse cx="100" cy="140" rx="38" ry="34" fill="${D.body}"/><ellipse cx="100" cy="146" rx="24" ry="24" fill="${D.belly}"/>`;
  s += `<ellipse cx="82" cy="174" rx="13" ry="7" fill="${D.dark}"/><ellipse cx="118" cy="174" rx="13" ry="7" fill="${D.dark}"/>`;
  if (level >= 4)
    s += `<path d="M78 62 L72 42 L90 56Z" fill="${D.dark}"/><path d="M122 62 L128 42 L110 56Z" fill="${D.dark}"/>`;
  s += `<circle cx="100" cy="86" r="34" fill="${D.body}"/><ellipse cx="100" cy="102" rx="19" ry="11" fill="${D.belly}"/>`;
  s += eyes(100, 80, 13, 9) + cheeks(100, 96, 24) + smile(100, 104, 7);
  if (level >= 5)
    s += `<path d="M78 56 L82 36 L92 48 L100 32 L108 48 L118 36 L122 56Z" fill="#ffc83d" stroke="#e0a400" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="46" r="3.5" fill="#ff6b6b"/>`;
  return s;
}

const dragon = [
  () =>
    shadow(44) +
    `<ellipse cx="100" cy="112" rx="50" ry="64" fill="${D.light}" stroke="${D.body}" stroke-width="4"/><circle cx="82" cy="90" r="10" fill="${D.body}" opacity=".7"/><circle cx="118" cy="122" r="13" fill="${D.body}" opacity=".7"/><circle cx="90" cy="148" r="7" fill="${D.body}" opacity=".7"/><circle cx="122" cy="78" r="6" fill="${D.body}" opacity=".7"/><ellipse cx="80" cy="72" rx="8" ry="14" fill="#fff" opacity=".5" transform="rotate(25 80 72)"/>`,
  () =>
    shadow(46) +
    `<circle cx="100" cy="74" r="32" fill="${D.body}"/><ellipse cx="100" cy="88" rx="17" ry="10" fill="${D.belly}"/>` +
    eyes(100, 68, 12, 9) +
    cheeks(100, 84, 22) +
    smile(100, 90, 6) +
    `<path d="M50 112 L64 100 L76 114 L90 100 L102 114 L114 100 L126 114 L138 100 L150 112 C152 160 128 178 100 178 C72 178 48 160 50 112Z" fill="${D.light}" stroke="${D.body}" stroke-width="4" stroke-linejoin="round"/><circle cx="84" cy="146" r="9" fill="${D.body}" opacity=".7"/><circle cx="122" cy="138" r="7" fill="${D.body}" opacity=".7"/>`,
  () => shadow() + dragonBody(3),
  () => shadow() + dragonBody(4),
  () => shadow() + dragonBody(5) + stars(),
];

// ---- owl ----------------------------------------------------------------------------------------

const O = { body: "#a8754b", dark: "#7f5434", belly: "#f2dcbc", face: "#f8ead2", beak: "#f59e3b", fluff: "#e9c48f" };

function owlBody(level) {
  let s = "";
  s += `<path d="M58 62 L64 36 L82 56Z" fill="${O.dark}"/><path d="M142 62 L136 36 L118 56Z" fill="${O.dark}"/>`;
  s += `<ellipse cx="100" cy="118" rx="52" ry="60" fill="${O.body}"/>`;
  s += `<ellipse cx="54" cy="128" rx="12" ry="30" fill="${O.dark}" transform="rotate(12 54 128)"/><ellipse cx="146" cy="128" rx="12" ry="30" fill="${O.dark}" transform="rotate(-12 146 128)"/>`;
  s += `<ellipse cx="100" cy="140" rx="32" ry="34" fill="${O.belly}"/>`;
  s += `<path d="M88 132 l6 6 l6 -6 M100 132 l6 6 l6 -6 M94 146 l6 6 l6 -6" fill="none" stroke="${O.fluff}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<circle cx="80" cy="88" r="20" fill="${O.face}"/><circle cx="120" cy="88" r="20" fill="${O.face}"/>`;
  s += eyes(100, 88, 20, 12);
  s += `<path d="M94 102 L106 102 L100 114Z" fill="${O.beak}"/>`;
  s += `<ellipse cx="86" cy="176" rx="9" ry="5" fill="${O.beak}"/><ellipse cx="114" cy="176" rx="9" ry="5" fill="${O.beak}"/>`;
  if (level >= 4)
    s += `<path d="M66 132 L100 138 L134 132 L134 168 L100 174 L66 168Z" fill="#4f8ff7" stroke="#2e6fd6" stroke-width="3" stroke-linejoin="round"/><path d="M100 138 L100 174" stroke="#2e6fd6" stroke-width="3"/><path d="M74 146 h18 M74 154 h18 M108 146 h18 M108 154 h18" stroke="#d6e6ff" stroke-width="3" stroke-linecap="round"/>`;
  if (level >= 5)
    s += `<path d="M58 54 L100 36 L142 54 L100 72Z" fill="${INK}"/><path d="M76 60 L76 74 C90 80 110 80 124 74 L124 60 L100 70Z" fill="${INK}"/><path d="M142 54 L142 78" stroke="#ffc83d" stroke-width="3"/><circle cx="142" cy="80" r="4" fill="#ffc83d"/>`;
  return s;
}

const owl = [
  () =>
    shadow(44) +
    `<ellipse cx="100" cy="112" rx="50" ry="64" fill="#f6e4c8" stroke="#d4a373" stroke-width="4"/><path d="M62 104 L74 94 L86 106 L98 94 L110 106 L122 94 L138 104" fill="none" stroke="#b07a4f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="112" cy="140" r="7" fill="#b07a4f"/><circle cx="88" cy="152" r="5" fill="#b07a4f"/><circle cx="84" cy="74" r="4" fill="#b07a4f"/>`,
  () =>
    shadow(46) +
    `<path d="M100 64 C94 52 102 44 110 48 C104 50 104 56 108 60" fill="none" stroke="${O.dark}" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="118" r="54" fill="${O.fluff}"/><circle cx="56" cy="116" r="10" fill="${O.fluff}"/><circle cx="144" cy="116" r="10" fill="${O.fluff}"/><ellipse cx="100" cy="142" rx="30" ry="26" fill="${O.face}"/>` +
    eyes(100, 106, 18, 12) +
    cheeks(100, 124, 30) +
    `<path d="M95 118 L105 118 L100 127Z" fill="${O.beak}"/><ellipse cx="86" cy="174" rx="9" ry="5" fill="${O.beak}"/><ellipse cx="114" cy="174" rx="9" ry="5" fill="${O.beak}"/>`,
  () => shadow() + owlBody(3),
  () => shadow() + owlBody(4),
  () => shadow() + owlBody(5) + stars(),
];

// ---- robot --------------------------------------------------------------------------------------

const R = { head: "#4fa8ff", screen: "#e6f3ff", body: "#2e7fd6", limb: "#8aa0b8", dark: "#1f5fad" };

function robotBody(level) {
  let s = "";
  if (level >= 5)
    s += `<path d="M80 168 L86 192 L92 168Z" fill="#ffc83d"/><path d="M108 168 L114 192 L120 168Z" fill="#ffc83d"/><path d="M83 168 L86 182 L89 168Z" fill="#ff7a6b"/><path d="M111 168 L114 182 L117 168Z" fill="#ff7a6b"/>`;
  s += `<rect x="80" y="146" width="12" height="24" rx="5" fill="${R.limb}"/><rect x="108" y="146" width="12" height="24" rx="5" fill="${R.limb}"/>`;
  if (level >= 4)
    s += `<rect x="38" y="112" width="34" height="11" rx="5.5" fill="${R.limb}"/><rect x="128" y="112" width="34" height="11" rx="5.5" fill="${R.limb}"/><circle cx="38" cy="117" r="9" fill="${R.head}"/><circle cx="162" cy="117" r="9" fill="${R.head}"/>`;
  s += `<rect x="68" y="98" width="64" height="54" rx="12" fill="${R.body}"/>`;
  s += level >= 4 ? heart(100, 124, 11) : `<circle cx="100" cy="124" r="8" fill="#ffc83d"/>`;
  s += `<path d="M100 44 L100 30" stroke="${R.limb}" stroke-width="4"/>`;
  if (level >= 5) s += `<circle cx="100" cy="26" r="13" fill="#ff6b6b" opacity=".25"/>`;
  s += `<circle cx="100" cy="26" r="7" fill="#ff6b6b"/>`;
  s += `<rect x="62" y="42" width="76" height="60" rx="16" fill="${R.head}"/><rect x="72" y="52" width="56" height="40" rx="11" fill="${R.screen}"/>`;
  s += eyes(100, 70, 12, 7) + smile(100, 80, 6);
  if (level >= 5)
    s += `<path d="M58 66 C58 28 142 28 142 66" fill="none" stroke="#9b7bff" stroke-width="6" stroke-linecap="round"/><rect x="50" y="56" width="14" height="30" rx="7" fill="#9b7bff"/><rect x="136" y="56" width="14" height="30" rx="7" fill="#9b7bff"/>`;
  return s;
}

const robot = [
  () =>
    shadow(52) +
    gear(84, 92, 16, "#ffa53d") +
    gear(118, 96, 12, "#9b7bff") +
    `<circle cx="104" cy="78" r="5" fill="#4fa8ff"/><rect x="50" y="104" width="100" height="66" rx="10" fill="#c9d8ea" stroke="#7d93ad" stroke-width="4"/><rect x="50" y="104" width="100" height="16" rx="6" fill="#b5c7dc" stroke="#7d93ad" stroke-width="4"/><circle cx="66" cy="146" r="3.5" fill="#7d93ad"/><circle cx="134" cy="146" r="3.5" fill="#7d93ad"/>`,
  () =>
    shadow(46) +
    `<circle cx="80" cy="166" r="12" fill="${INK}"/><circle cx="120" cy="166" r="12" fill="${INK}"/><circle cx="80" cy="166" r="5" fill="${R.limb}"/><circle cx="120" cy="166" r="5" fill="${R.limb}"/><rect x="74" y="130" width="52" height="34" rx="9" fill="${R.body}"/><path d="M100 58 L100 42" stroke="${R.limb}" stroke-width="4"/><circle cx="100" cy="38" r="7" fill="#ff6b6b"/><rect x="58" y="56" width="84" height="70" rx="18" fill="${R.head}"/><rect x="69" y="67" width="62" height="46" rx="12" fill="${R.screen}"/>` +
    eyes(100, 86, 14, 8) +
    smile(100, 98, 7),
  () => shadow() + robotBody(3),
  () => shadow() + robotBody(4),
  () => shadow() + robotBody(5) + stars(),
];

// ---- seed / tree --------------------------------------------------------------------------------

const S = { soil: "#b07a4f", soilTop: "#c68b5b", stem: "#3fa34d", leaf: "#6cc46a", leafDark: "#3fa34d", trunk: "#8b5a35", canopy: "#4cb35a", canopyLight: "#7cd17a" };
const soil = `<ellipse cx="100" cy="172" rx="64" ry="13" fill="${S.soil}"/><ellipse cx="100" cy="168" rx="60" ry="9" fill="${S.soilTop}"/>`;
const leaf = (x, y, angle, len = 26) =>
  `<path d="M${x} ${y} C${x + len * 0.4} ${y - len * 0.5} ${x + len} ${y - len * 0.4} ${x + len * 1.15} ${y} C${x + len * 0.8} ${y + len * 0.25} ${x + len * 0.3} ${y + len * 0.2} ${x} ${y}Z" fill="${S.leaf}" stroke="${S.leafDark}" stroke-width="2" transform="rotate(${angle} ${x} ${y})"/>`;

function tree(level) {
  let s = soil;
  s += `<path d="M92 168 L95 116 L105 116 L108 168Z" fill="${S.trunk}"/><path d="M100 140 L118 124" stroke="${S.trunk}" stroke-width="6" stroke-linecap="round"/>`;
  s += `<circle cx="100" cy="86" r="46" fill="${S.canopy}"/><circle cx="68" cy="104" r="24" fill="${S.canopy}"/><circle cx="132" cy="104" r="24" fill="${S.canopy}"/><circle cx="84" cy="70" r="16" fill="${S.canopyLight}" opacity=".7"/>`;
  s += eyes(100, 94, 12, 7) + smile(100, 106, 6);
  if (level >= 5)
    s += [[66, 76], [136, 80], [82, 120], [124, 120], [100, 50], [56, 104]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${i === 4 ? "#ffc83d" : "#ff8fb1"}"/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff4c2"/>`)
      .join("");
  return s;
}

const seed = [
  () =>
    soil +
    `<path d="M100 84 C134 100 138 150 100 166 C62 150 66 100 100 84Z" fill="#a0673d"/><path d="M100 92 C114 106 114 136 100 156" fill="none" stroke="#c58a5a" stroke-width="3" stroke-linecap="round"/>` +
    eyes(100, 124, 12, 8) +
    cheeks(100, 138, 20) +
    smile(100, 142, 6),
  () => soil + `<path d="M100 168 C98 148 102 130 100 114" fill="none" stroke="${S.stem}" stroke-width="6" stroke-linecap="round"/>` + leaf(100, 116, 200, 40) + leaf(100, 116, -20, 40),
  () =>
    soil +
    `<path d="M100 168 C96 140 104 110 100 70" fill="none" stroke="${S.stem}" stroke-width="7" stroke-linecap="round"/>` +
    leaf(100, 140, 195, 30) +
    leaf(100, 118, -15, 32) +
    leaf(100, 96, 200, 30) +
    leaf(100, 76, -25, 28),
  () => tree(4),
  () => tree(5) + stars(),
];

// ---- write --------------------------------------------------------------------------------------

const DRAW = { ejderha: dragon, baykus: owl, robot, tohum: seed };

for (const [slug, type] of Object.entries(TYPES)) {
  mkdirSync(join(OUT, slug), { recursive: true });
  type.stages.forEach((stage, i) => {
    const title = `${type.name}: ${stage}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${title}">
<title>${title}</title>
<circle cx="100" cy="100" r="98" fill="${type.bg}"/>
${DRAW[slug][i]()}
</svg>
`;
    writeFileSync(join(OUT, slug, `${i + 1}.svg`), svg);
  });
}
console.log("20 karakter görseli yazıldı:", OUT);
