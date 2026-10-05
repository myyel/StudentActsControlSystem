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
  kedi: { name: "Kedi", bg: "#fff0dc", stages: ["Sepetteki yavru", "Minik kedi", "Oyuncu kedi", "Fiyonklu kedi", "Bilge kedi"] },
  tavsan: { name: "Tavşan", bg: "#fde8f0", stages: ["Yuvadaki yavru", "Pamuk yavru", "Zıpzıp tavşan", "Çiçekli tavşan", "Bilge tavşan"] },
  penguen: { name: "Penguen", bg: "#e3f1fb", stages: ["Buzlu yumurta", "Pofuduk yavru", "Meraklı penguen", "Atkılı penguen", "Kral penguen"] },
  tilki: { name: "Tilki", bg: "#ffe9dc", stages: ["Yapraklı yuva", "Yavru tilki", "Çevik tilki", "Kaşif tilki", "Bilge tilki"] },
  kaplumbaga: { name: "Kaplumbağa", bg: "#e6f5e4", stages: ["Kumdaki yumurta", "Minik kaplumbağa", "Yürüyen kaplumbağa", "Çiçekli kaplumbağa", "Bilge kaplumbağa"] },
  ahtapot: { name: "Ahtapot", bg: "#efe6ff", stages: ["Deniz kabuğu", "Minik ahtapot", "Neşeli ahtapot", "Dalgıç ahtapot", "Bilge ahtapot"] },
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

// ---- shared parts for the second set ------------------------------------------------------------

const crown = (cx = 100, y = 44, w = 22) =>
  `<path d="M${cx - w} ${y + 10} L${cx - w + 4} ${y - 10} L${cx - w / 2} ${y} L${cx} ${y - 16} L${cx + w / 2} ${y} L${cx + w - 4} ${y - 10} L${cx + w} ${y + 10}Z" fill="#ffc83d" stroke="#e0a400" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${cx}" cy="${y - 1}" r="3.5" fill="#ff6b6b"/>`;
const flower = (x, y, r = 6, petal = "#ff8fb1") =>
  [0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<circle cx="${(x + Math.cos(rad) * r).toFixed(1)}" cy="${(y + Math.sin(rad) * r).toFixed(1)}" r="${r * 0.75}" fill="${petal}"/>`;
    })
    .join("") + `<circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="#ffc83d"/>`;
const bubbles = (list) =>
  list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".7" stroke="#9fc9f0" stroke-width="2"/>`).join("");
const glasses = (cx, y, dx, r = 11) =>
  `<circle cx="${cx - dx}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="${cx + dx}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="3"/><path d="M${cx - dx + r} ${y} L${cx + dx - r} ${y}" stroke="${INK}" stroke-width="3"/>`;

// ---- cat ----------------------------------------------------------------------------------------

const C = { fur: "#f7a144", dark: "#d9792a", light: "#ffe1bd", pink: "#ff9fb0" };

function catHead(cx, cy, r) {
  let s = "";
  for (const side of [-1, 1]) {
    s += `<path d="M${cx + side * r * 0.95} ${cy - r * 0.2} L${cx + side * r * 0.8} ${cy - r * 1.25} L${cx + side * r * 0.15} ${cy - r * 0.85}Z" fill="${C.fur}" stroke="${C.dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M${cx + side * r * 0.75} ${cy - r * 0.45} L${cx + side * r * 0.72} ${cy - r * 0.98} L${cx + side * r * 0.35} ${cy - r * 0.78}Z" fill="${C.pink}"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.fur}"/>`;
  s += `<path d="M${cx} ${cy - r * 0.95} L${cx} ${cy - r * 0.6} M${cx - r * 0.3} ${cy - r * 0.9} L${cx - r * 0.25} ${cy - r * 0.62} M${cx + r * 0.3} ${cy - r * 0.9} L${cx + r * 0.25} ${cy - r * 0.62}" stroke="${C.dark}" stroke-width="3.5" stroke-linecap="round"/>`;
  s += `<ellipse cx="${cx}" cy="${cy + r * 0.42}" rx="${r * 0.55}" ry="${r * 0.36}" fill="${C.light}"/>`;
  s += eyes(cx, cy - r * 0.08, r * 0.38, r * 0.27);
  s += `<path d="M${cx - 4} ${cy + r * 0.26} L${cx + 4} ${cy + r * 0.26} L${cx} ${cy + r * 0.38}Z" fill="${C.pink}"/>`;
  s += smile(cx, cy + r * 0.45, r * 0.2);
  s += `<path d="M${cx - r * 0.5} ${cy + r * 0.35} L${cx - r * 1.05} ${cy + r * 0.25} M${cx - r * 0.5} ${cy + r * 0.48} L${cx - r * 1.05} ${cy + r * 0.55} M${cx + r * 0.5} ${cy + r * 0.35} L${cx + r * 1.05} ${cy + r * 0.25} M${cx + r * 0.5} ${cy + r * 0.48} L${cx + r * 1.05} ${cy + r * 0.55}" stroke="${C.dark}" stroke-width="2" stroke-linecap="round"/>`;
  return s;
}

function catBody(level) {
  let s = `<path d="M128 164 C172 166 176 120 152 108" fill="none" stroke="${C.fur}" stroke-width="13" stroke-linecap="round"/><path d="M152 108 C148 104 146 104 144 106" fill="none" stroke="${C.dark}" stroke-width="13" stroke-linecap="round"/>`;
  s += `<ellipse cx="100" cy="144" rx="38" ry="34" fill="${C.fur}"/><ellipse cx="100" cy="150" rx="22" ry="24" fill="${C.light}"/>`;
  s += `<ellipse cx="82" cy="175" rx="12" ry="7" fill="${C.light}" stroke="${C.dark}" stroke-width="2"/><ellipse cx="118" cy="175" rx="12" ry="7" fill="${C.light}" stroke="${C.dark}" stroke-width="2"/>`;
  // Yarn ball: the playful part of level 3.
  s += `<circle cx="38" cy="164" r="14" fill="#7cb7ff"/><path d="M28 156 C36 162 42 170 44 176 M30 170 C38 166 46 160 50 156 M36 151 C34 160 36 170 40 177" fill="none" stroke="#4f8ff7" stroke-width="2.5" stroke-linecap="round"/><path d="M50 160 C60 156 62 166 70 162" fill="none" stroke="#4f8ff7" stroke-width="2.5" stroke-linecap="round"/>`;
  s += catHead(100, 84, 34);
  if (level >= 4)
    s += `<path d="M100 118 L80 108 L80 128Z M100 118 L120 108 L120 128Z" fill="#ff6b6b" stroke="#d94848" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="118" r="6" fill="#ffc83d" stroke="#e0a400" stroke-width="2"/>`;
  if (level >= 5) s += crown(100, 40, 22);
  return s;
}

const cat = [
  () =>
    shadow(54) +
    catHead(100, 102, 30) +
    `<path d="M44 122 L156 122 L146 174 L54 174Z" fill="#d9a066" stroke="#a8743f" stroke-width="4" stroke-linejoin="round"/><path d="M58 136 H142 M60 150 H140 M62 162 H138 M76 122 L72 174 M100 122 V174 M124 122 L128 174" stroke="#b9854f" stroke-width="3"/><rect x="40" y="116" width="120" height="12" rx="6" fill="#c48a52" stroke="#a8743f" stroke-width="3"/>`,
  () =>
    shadow(40) +
    `<path d="M120 162 C150 164 152 136 138 128" fill="none" stroke="${C.fur}" stroke-width="10" stroke-linecap="round"/><ellipse cx="100" cy="150" rx="28" ry="26" fill="${C.fur}"/><ellipse cx="100" cy="155" rx="16" ry="17" fill="${C.light}"/><ellipse cx="86" cy="175" rx="9" ry="6" fill="${C.light}" stroke="${C.dark}" stroke-width="2"/><ellipse cx="114" cy="175" rx="9" ry="6" fill="${C.light}" stroke="${C.dark}" stroke-width="2"/>` +
    catHead(100, 98, 32),
  () => shadow() + catBody(3),
  () => shadow() + catBody(4),
  () => shadow() + catBody(5) + stars(),
];

// ---- rabbit -------------------------------------------------------------------------------------

const T = { fur: "#fffaf6", line: "#d8c3b8", pink: "#ffb3c6", carrot: "#ff9a3d", leaf: "#5cbf60" };

function rabbitHead(cx, cy, r, droop = false) {
  let s = "";
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.42;
    s += droop
      ? `<ellipse cx="${cx + side * r * 0.95}" cy="${cy + r * 0.1}" rx="${r * 0.28}" ry="${r * 0.7}" fill="${T.fur}" stroke="${T.line}" stroke-width="3" transform="rotate(${side * -25} ${cx + side * r * 0.95} ${cy + r * 0.1})"/>`
      : `<ellipse cx="${ex}" cy="${cy - r * 1.35}" rx="${r * 0.27}" ry="${r * 0.78}" fill="${T.fur}" stroke="${T.line}" stroke-width="3" transform="rotate(${side * 8} ${ex} ${cy - r * 0.6})"/><ellipse cx="${ex}" cy="${cy - r * 1.3}" rx="${r * 0.13}" ry="${r * 0.55}" fill="${T.pink}" transform="rotate(${side * 8} ${ex} ${cy - r * 0.6})"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>`;
  s += eyes(cx, cy - r * 0.08, r * 0.38, r * 0.27) + cheeks(cx, cy + r * 0.32, r * 0.62);
  s += `<ellipse cx="${cx}" cy="${cy + r * 0.28}" rx="5" ry="3.5" fill="${T.pink}"/>` + smile(cx, cy + r * 0.42, r * 0.18);
  s += `<rect x="${cx - 4}" y="${cy + r * 0.5}" width="8" height="7" rx="1.5" fill="#fff" stroke="${T.line}" stroke-width="1.5"/>`;
  return s;
}

function rabbitBody(level) {
  let s = `<circle cx="138" cy="160" r="11" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>`;
  s += `<ellipse cx="100" cy="146" rx="36" ry="32" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/><ellipse cx="100" cy="152" rx="20" ry="20" fill="#fff0f4"/>`;
  s += `<ellipse cx="80" cy="176" rx="15" ry="7" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/><ellipse cx="120" cy="176" rx="15" ry="7" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>`;
  // Carrot in the paw: the part of level 3.
  s += `<path d="M138 132 L170 116 L166 132Z" fill="${T.carrot}" stroke="#e07a1f" stroke-width="2" stroke-linejoin="round"/><path d="M168 118 l8 -10 M168 118 l12 -2 M168 118 l4 -12" stroke="${T.leaf}" stroke-width="3" stroke-linecap="round"/><circle cx="136" cy="134" r="8" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>`;
  s += rabbitHead(100, 92, 32);
  if (level >= 4) s += flower(70, 62, 6, "#ff8fb1") + flower(86, 54, 5, "#ffc83d") + flower(114, 54, 5, "#9b7bff") + flower(130, 62, 6, "#ff8fb1");
  if (level >= 5)
    s += `<path d="M52 170 L40 112" stroke="#9b7bff" stroke-width="5" stroke-linecap="round"/>${star(38, 104, 14)}<circle cx="60" cy="138" r="8" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>`;
  return s;
}

const rabbit = [
  () =>
    `<ellipse cx="100" cy="160" rx="72" ry="26" fill="#c68b5b"/><ellipse cx="100" cy="154" rx="46" ry="14" fill="#5a3a26"/>` +
    rabbitHead(100, 136, 26) +
    `<path d="M28 162 C40 146 160 146 172 162 C160 186 40 186 28 162Z" fill="#c68b5b"/><path d="M40 160 h12 M150 160 h12 M70 172 h10 M120 172 h10" stroke="#a8743f" stroke-width="3" stroke-linecap="round"/><path d="M152 150 l6 -16 M152 150 l12 -8 M152 150 l-2 -16" stroke="${T.leaf}" stroke-width="4" stroke-linecap="round"/>`,
  () =>
    shadow(46) +
    `<circle cx="100" cy="146" r="34" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/><circle cx="134" cy="158" r="9" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/><ellipse cx="84" cy="176" rx="11" ry="6" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/><ellipse cx="116" cy="176" rx="11" ry="6" fill="${T.fur}" stroke="${T.line}" stroke-width="3"/>` +
    rabbitHead(100, 100, 32, true),
  () => shadow() + rabbitBody(3),
  () => shadow() + rabbitBody(4),
  () => shadow() + rabbitBody(5) + stars(),
];

// ---- penguin ------------------------------------------------------------------------------------

const P = { black: "#2f3e55", white: "#ffffff", beak: "#f59e3b", grey: "#a9b6c4", ice: "#bfe3fb", iceLine: "#7fc0ea" };

function penguinBody(level) {
  let s = `<ellipse cx="84" cy="176" rx="13" ry="6" fill="${P.beak}"/><ellipse cx="116" cy="176" rx="13" ry="6" fill="${P.beak}"/>`;
  s += `<ellipse cx="52" cy="126" rx="11" ry="30" fill="${P.black}" transform="rotate(20 52 126)"/><ellipse cx="148" cy="126" rx="11" ry="30" fill="${P.black}" transform="rotate(-20 148 126)"/>`;
  s += `<ellipse cx="100" cy="118" rx="48" ry="60" fill="${P.black}"/><ellipse cx="100" cy="132" rx="34" ry="44" fill="${P.white}"/>`;
  s += `<path d="M66 80 C70 62 90 60 100 72 C110 60 130 62 134 80 C130 100 112 104 100 96 C88 104 70 100 66 80Z" fill="${P.white}"/>`;
  s += eyes(100, 82, 16, 9) + cheeks(100, 98, 26);
  s += `<path d="M92 92 L108 92 L100 104Z" fill="${P.beak}"/>`;
  if (level >= 4)
    s += `<path d="M62 108 C80 118 120 118 138 108 L138 122 C120 132 80 132 62 122Z" fill="#ff6b6b"/><path d="M78 114 L78 126 M96 117 L96 129 M114 116 L114 128" stroke="#fff" stroke-width="4"/><path d="M122 120 L132 160 L118 160 L112 124Z" fill="#ff6b6b"/><path d="M118 140 h14 M120 150 h12" stroke="#fff" stroke-width="3"/>`;
  if (level >= 5) s += crown(100, 52, 24);
  return s;
}

const penguin = [
  () =>
    `<path d="M40 158 L160 158 L168 182 L32 182Z" fill="${P.ice}" stroke="${P.iceLine}" stroke-width="3" stroke-linejoin="round"/><path d="M60 166 l14 8 M120 164 l18 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="100" cy="106" rx="44" ry="56" fill="#fdfdff" stroke="${P.iceLine}" stroke-width="4"/><circle cx="84" cy="90" r="8" fill="${P.ice}"/><circle cx="116" cy="118" r="10" fill="${P.ice}"/><circle cx="92" cy="140" r="6" fill="${P.ice}"/><circle cx="118" cy="80" r="5" fill="${P.ice}"/><ellipse cx="82" cy="70" rx="7" ry="12" fill="#fff" transform="rotate(25 82 70)"/>`,
  () =>
    shadow(44) +
    `<ellipse cx="86" cy="176" rx="11" ry="5" fill="${P.beak}"/><ellipse cx="114" cy="176" rx="11" ry="5" fill="${P.beak}"/><circle cx="100" cy="138" r="40" fill="${P.grey}"/><circle cx="64" cy="132" r="9" fill="${P.grey}"/><circle cx="136" cy="132" r="9" fill="${P.grey}"/><circle cx="100" cy="86" r="34" fill="${P.black}"/><path d="M74 88 C76 72 92 70 100 80 C108 70 124 72 126 88 C122 104 108 108 100 102 C92 108 78 104 74 88Z" fill="${P.white}"/>` +
    eyes(100, 88, 13, 8) +
    `<path d="M93 98 L107 98 L100 108Z" fill="${P.beak}"/>`,
  () => shadow() + penguinBody(3),
  () => shadow() + penguinBody(4),
  () => shadow() + penguinBody(5) + stars(),
];

// ---- fox ----------------------------------------------------------------------------------------

const F = { fur: "#f2732e", dark: "#c9541a", white: "#fff4ea", black: "#3b2b26" };

function foxHead(cx, cy, r) {
  let s = "";
  for (const side of [-1, 1]) {
    s += `<path d="M${cx + side * r * 0.95} ${cy - r * 0.15} L${cx + side * r * 0.85} ${cy - r * 1.35} L${cx + side * r * 0.2} ${cy - r * 0.85}Z" fill="${F.fur}" stroke="${F.dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M${cx + side * r * 0.86} ${cy - r * 1.05} L${cx + side * r * 0.85} ${cy - r * 1.35} L${cx + side * r * 0.62} ${cy - r * 1.18}Z" fill="${F.black}"/>`;
  }
  s += `<path d="M${cx - r * 1.15} ${cy + r * 0.2} C${cx - r * 1.1} ${cy - r * 1.05} ${cx + r * 1.1} ${cy - r * 1.05} ${cx + r * 1.15} ${cy + r * 0.2} C${cx + r * 0.7} ${cy + r * 0.95} ${cx - r * 0.7} ${cy + r * 0.95} ${cx - r * 1.15} ${cy + r * 0.2}Z" fill="${F.fur}"/>`;
  s += `<path d="M${cx - r * 1.1} ${cy + r * 0.2} Q${cx - r * 0.5} ${cy + r * 0.05} ${cx} ${cy + r * 0.25} Q${cx + r * 0.5} ${cy + r * 0.05} ${cx + r * 1.1} ${cy + r * 0.2} C${cx + r * 0.7} ${cy + r * 0.9} ${cx - r * 0.7} ${cy + r * 0.9} ${cx - r * 1.1} ${cy + r * 0.2}Z" fill="${F.white}"/>`;
  s += eyes(cx, cy - r * 0.18, r * 0.42, r * 0.26);
  s += `<ellipse cx="${cx}" cy="${cy + r * 0.32}" rx="6" ry="4.5" fill="${F.black}"/>` + smile(cx, cy + r * 0.5, r * 0.18);
  return s;
}

const foxTail = (x, y, k = 1) =>
  `<path d="M${x} ${y} C${x + 50 * k} ${y + 6 * k} ${x + 64 * k} ${y - 40 * k} ${x + 44 * k} ${y - 64 * k} C${x + 40 * k} ${y - 34 * k} ${x + 20 * k} ${y - 22 * k} ${x} ${y - 20 * k}Z" fill="${F.fur}" stroke="${F.dark}" stroke-width="2.5" stroke-linejoin="round"/><path d="M${x + 44 * k} ${y - 64 * k} C${x + 56 * k} ${y - 50 * k} ${x + 58 * k} ${y - 38 * k} ${x + 54 * k} ${y - 30 * k} C${x + 48 * k} ${y - 40 * k} ${x + 44 * k} ${y - 50 * k} ${x + 44 * k} ${y - 64 * k}Z" fill="${F.white}"/>`;

function foxBody(level) {
  let s = foxTail(122, 170, 1);
  s += `<ellipse cx="100" cy="146" rx="34" ry="32" fill="${F.fur}"/><path d="M84 124 C90 150 110 150 116 124 C116 160 106 172 100 172 C94 172 84 160 84 124Z" fill="${F.white}"/>`;
  s += `<ellipse cx="82" cy="176" rx="12" ry="6" fill="${F.black}"/><ellipse cx="118" cy="176" rx="12" ry="6" fill="${F.black}"/>`;
  s += foxHead(100, 84, 34);
  if (level >= 4)
    s += `<path d="M60 152 L44 176" stroke="#8b5a35" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="142" r="15" fill="#d6f0ff" opacity=".85" stroke="#8b5a35" stroke-width="5"/><path d="M60 136 a8 8 0 0 1 8 -2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  if (level >= 5)
    s +=
      glasses(100, 78, 14, 10) +
      `<path d="M88 118 L100 132 L112 118" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="138" r="9" fill="#ffc83d" stroke="#e0a400" stroke-width="2.5"/>` +
      star(100, 138, 5, "#fff4c2");
  return s;
}

const fox = [
  () =>
    shadow(56) +
    foxHead(100, 108, 28) +
    [
      [56, 150, -30, "#f2732e"],
      [80, 140, 10, "#ffc83d"],
      [104, 148, -15, "#e8542c"],
      [128, 140, 25, "#f59e3b"],
      [146, 152, 50, "#ffc83d"],
      [70, 164, 15, "#e8542c"],
      [96, 166, -40, "#f59e3b"],
      [124, 164, 5, "#f2732e"],
      [148, 170, -20, "#e8542c"],
      [50, 172, 30, "#ffc83d"],
    ]
      .map(([x, y, a, c]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="12" fill="${c}" stroke="#b5532a" stroke-width="2" transform="rotate(${a} ${x} ${y})"/>`)
      .join(""),
  () =>
    shadow(44) +
    foxTail(118, 172, 0.7) +
    `<ellipse cx="100" cy="152" rx="26" ry="24" fill="${F.fur}"/><path d="M88 136 C92 154 108 154 112 136 C112 164 104 172 100 172 C96 172 88 164 88 136Z" fill="${F.white}"/><ellipse cx="86" cy="176" rx="9" ry="5" fill="${F.black}"/><ellipse cx="114" cy="176" rx="9" ry="5" fill="${F.black}"/>` +
    foxHead(100, 100, 32),
  () => shadow() + foxBody(3),
  () => shadow() + foxBody(4),
  () => shadow() + foxBody(5) + stars(),
];

// ---- turtle -------------------------------------------------------------------------------------

const K = { shell: "#4a9e5c", shellDark: "#2f7a43", shellLight: "#8fd19a", skin: "#a6d86e", skinDark: "#78b443", sand: "#f3dca6", sandDark: "#dcbf7c" };
const sand = `<ellipse cx="100" cy="172" rx="70" ry="15" fill="${K.sandDark}"/><ellipse cx="100" cy="168" rx="66" ry="11" fill="${K.sand}"/>`;

const turtleHead = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${K.skin}" stroke="${K.skinDark}" stroke-width="3"/>` +
  eyes(cx, cy - r * 0.1, r * 0.4, r * 0.27) +
  cheeks(cx, cy + r * 0.35, r * 0.6) +
  smile(cx, cy + r * 0.4, r * 0.2);

function turtleBody(level) {
  let s = `<ellipse cx="54" cy="164" rx="16" ry="10" fill="${K.skin}" stroke="${K.skinDark}" stroke-width="3"/><ellipse cx="146" cy="164" rx="16" ry="10" fill="${K.skin}" stroke="${K.skinDark}" stroke-width="3"/>`;
  s += `<path d="M40 160 C40 104 160 104 160 160Z" fill="${K.shell}" stroke="${K.shellDark}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<path d="M100 124 L114 132 L114 148 L100 156 L86 148 L86 132Z M64 142 L76 136 L86 148 M136 142 L124 136 L114 148 M100 124 L100 112 M76 136 L70 122 M124 136 L130 122" fill="${K.shellLight}" stroke="${K.shellDark}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<rect x="38" y="156" width="124" height="10" rx="5" fill="#f0e2a8" stroke="${K.shellDark}" stroke-width="3"/>`;
  s += turtleHead(100, 88, 30);
  if (level >= 4) s += flower(64, 128, 7, "#ff8fb1") + flower(138, 132, 6, "#ffc83d") + flower(108, 116, 5, "#9b7bff");
  if (level >= 5)
    s +=
      `<path d="M86 108 C88 124 112 124 114 108 C110 116 90 116 86 108Z" fill="#fff" stroke="#d8d8d8" stroke-width="2"/><path d="M168 176 L168 104 C168 92 182 92 182 104" fill="none" stroke="#8b5a35" stroke-width="6" stroke-linecap="round"/>` +
      glasses(100, 85, 12, 9);
  return s;
}

const turtle = [
  () =>
    sand +
    `<ellipse cx="100" cy="122" rx="40" ry="48" fill="#fffdf4" stroke="${K.sandDark}" stroke-width="4"/><circle cx="86" cy="104" r="6" fill="${K.shellLight}"/><circle cx="114" cy="128" r="8" fill="${K.shellLight}"/><circle cx="92" cy="148" r="5" fill="${K.shellLight}"/><ellipse cx="84" cy="92" rx="6" ry="11" fill="#fff" transform="rotate(25 84 92)"/>` +
    `<path d="M54 168 C70 158 130 158 146 168" fill="${K.sand}"/><circle cx="46" cy="160" r="4" fill="${K.sandDark}"/><circle cx="156" cy="158" r="3" fill="${K.sandDark}"/>`,
  () =>
    sand +
    `<ellipse cx="66" cy="164" rx="11" ry="7" fill="${K.skin}" stroke="${K.skinDark}" stroke-width="3"/><ellipse cx="134" cy="164" rx="11" ry="7" fill="${K.skin}" stroke="${K.skinDark}" stroke-width="3"/><path d="M56 164 C56 120 144 120 144 164Z" fill="${K.shell}" stroke="${K.shellDark}" stroke-width="4"/><path d="M100 136 L110 142 L110 154 L100 160 L90 154 L90 142Z" fill="${K.shellLight}" stroke="${K.shellDark}" stroke-width="3" stroke-linejoin="round"/>` +
    turtleHead(100, 108, 26),
  () => sand + turtleBody(3),
  () => sand + turtleBody(4),
  () => sand + turtleBody(5) + stars(),
];

// ---- octopus ------------------------------------------------------------------------------------

const A = { body: "#a77bf0", dark: "#7d55cc", light: "#d9c6ff", spot: "#c3a6ff" };

const tentacle = (x, y, dx, len, w = 12) =>
  `<path d="M${x} ${y} C${x + dx * 0.3} ${y + len * 0.5} ${x + dx} ${y + len * 0.4} ${x + dx * 0.9} ${y + len} C${x + dx * 1.2} ${y + len * 0.9} ${x + dx * 1.15} ${y + len * 0.7} ${x + dx * 1.05} ${y + len * 0.65}" fill="none" stroke="${A.body}" stroke-width="${w}" stroke-linecap="round"/>`;

const octopusHead = (cx, cy, r) =>
  `<path d="M${cx - r} ${cy + r * 0.4} C${cx - r * 1.1} ${cy - r * 1.3} ${cx + r * 1.1} ${cy - r * 1.3} ${cx + r} ${cy + r * 0.4} C${cx + r * 0.6} ${cy + r * 0.75} ${cx - r * 0.6} ${cy + r * 0.75} ${cx - r} ${cy + r * 0.4}Z" fill="${A.body}" stroke="${A.dark}" stroke-width="3"/>` +
  `<circle cx="${cx - r * 0.45}" cy="${cy - r * 0.7}" r="${r * 0.12}" fill="${A.spot}"/><circle cx="${cx + r * 0.5}" cy="${cy - r * 0.55}" r="${r * 0.16}" fill="${A.spot}"/><circle cx="${cx + r * 0.1}" cy="${cy - r * 0.92}" r="${r * 0.09}" fill="${A.spot}"/>` +
  eyes(cx, cy, r * 0.36, r * 0.25) +
  cheeks(cx, cy + r * 0.3, r * 0.6) +
  smile(cx, cy + r * 0.32, r * 0.17);

function octopusBody(level) {
  let s = "";
  for (const [x, dx] of [[70, -40], [80, -26], [90, -12], [96, 0], [104, 0], [110, 12], [120, 26], [130, 40]]) s += tentacle(x, 120, dx, 50);
  s += octopusHead(100, 92, 44);
  s += bubbles([[30, 60, 7], [42, 42, 4], [168, 70, 6], [160, 52, 3.5]]);
  if (level >= 4)
    s += `<path d="M56 86 C70 80 130 80 144 86" fill="none" stroke="${INK}" stroke-width="5"/><rect x="64" y="74" width="72" height="28" rx="12" fill="#bfe6ff" opacity=".55" stroke="#2e6fd6" stroke-width="4"/><path d="M146 92 L156 92 L156 48 C156 40 168 40 168 48" fill="none" stroke="#ffc83d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (level >= 5)
    s += `<path d="M100 26 L106 40 L121 40 L109 49 L113 63 L100 55 L87 63 L91 49 L79 40 L94 40Z" fill="#ff8f6b" stroke="#e0603a" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="46" r="3" fill="#ffd2c2"/><circle cx="150" cy="170" r="10" fill="#fff" stroke="#d6d1e8" stroke-width="2"/><circle cx="147" cy="167" r="3" fill="#fff" opacity=".9"/>`;
  return s;
}

const octopus = [
  () =>
    shadow(56) +
    // Open shell: the lid lifted, the little octopus peeking out between the halves.
    `<path d="M44 104 C48 60 152 60 156 104 C136 92 64 92 44 104Z" fill="#ffd6c2" stroke="#e8a58a" stroke-width="4" stroke-linejoin="round"/><path d="M100 70 L100 98 M78 74 L72 98 M122 74 L128 98 M58 84 L54 100 M142 84 L146 100" stroke="#e8a58a" stroke-width="3"/>` +
    `<circle cx="100" cy="132" r="22" fill="${A.body}" stroke="${A.dark}" stroke-width="3"/>` +
    eyes(100, 128, 9, 6.5) +
    `<path d="M40 140 C60 182 140 182 160 140 C140 150 60 150 40 140Z" fill="#ffe4d6" stroke="#e8a58a" stroke-width="4" stroke-linejoin="round"/>` +
    bubbles([[150, 60, 7], [164, 42, 4.5], [140, 38, 3]]),
  () =>
    shadow(40) +
    [[78, -18], [92, -6], [108, 6], [122, 18]].map(([x, dx]) => tentacle(x, 132, dx, 36, 11)).join("") +
    octopusHead(100, 108, 38),
  () => shadow() + octopusBody(3),
  () => shadow() + octopusBody(4),
  () => shadow() + octopusBody(5) + stars(),
];

// ---- write --------------------------------------------------------------------------------------

const DRAW = { ejderha: dragon, baykus: owl, robot, tohum: seed, kedi: cat, tavsan: rabbit, penguen: penguin, tilki: fox, kaplumbaga: turtle, ahtapot: octopus };

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
console.log(`${Object.keys(TYPES).length * 5} karakter görseli yazıldı:`, OUT);
