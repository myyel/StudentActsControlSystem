import { cn } from "@/lib/utils";

/**
 * Original, decorative backdrops for the adventure map's islands (no copyrighted art). Each topic
 * gets the next theme; scenery stays at the edges and the bottom band so stops and labels stay
 * readable. All of it is aria-hidden.
 */
export const ISLAND_THEMES = ["meadow", "sea", "space", "mountain"] as const;
export type IslandTheme = (typeof ISLAND_THEMES)[number];

export const ISLAND_EMOJI: Record<IslandTheme, string> = { meadow: "🌼", sea: "🌊", space: "🪐", mountain: "⛰️" };

const BACKGROUND: Record<IslandTheme, string> = {
  meadow: "bg-[linear-gradient(180deg,#dcefff_0%,#eef8ff_55%,#e3f7e8_100%)]",
  sea: "bg-[linear-gradient(180deg,#e9f5ff_0%,#d9eeff_60%,#cfe8ff_100%)]",
  space: "bg-[linear-gradient(180deg,#e6e0ff_0%,#efeaff_60%,#f5f1ff_100%)]",
  mountain: "bg-[linear-gradient(180deg,#fff6dc_0%,#fff1c9_55%,#ffe8d6_100%)]",
};

export const islandBackground = (theme: IslandTheme) => BACKGROUND[theme];

/** Height of the bottom scenery band; the path leaves this much room under its last stop. */
export const SCENE_BAND = 72;

export function IslandScene({ theme }: { theme: IslandTheme }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {theme === "meadow" && <Meadow />}
      {theme === "sea" && <Sea />}
      {theme === "space" && <Space />}
      {theme === "mountain" && <Mountain />}
    </div>
  );
}

function Corner({ className, children, size = 96 }: { className: string; children: React.ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn("absolute", className)}>
      {children}
    </svg>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 400 72"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 w-full"
      style={{ height: SCENE_BAND }}
    >
      {children}
    </svg>
  );
}

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
    <ellipse cx="0" cy="8" rx="22" ry="10" />
    <circle cx="-8" cy="2" r="10" />
    <circle cx="7" cy="0" r="13" />
  </g>
);

function Meadow() {
  return (
    <>
      <Corner className="-top-3 -right-3" size={110}>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x="48" y="8" width="4" height="14" rx="2" fill="#ffd66b" transform={`rotate(${i * 36} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="22" fill="#ffc83d" />
        <circle cx="43" cy="47" r="2.5" fill="#2b2d42" />
        <circle cx="57" cy="47" r="2.5" fill="#2b2d42" />
        <path d="M43 56q7 6 14 0" fill="none" stroke="#2b2d42" strokeWidth="2.5" strokeLinecap="round" />
      </Corner>
      <svg viewBox="0 0 120 40" width={120} height={40} className="absolute top-2 left-1/2 -translate-x-1/2 opacity-90">
        <Cloud x={30} y={18} />
        <Cloud x={88} y={22} s={0.7} />
      </svg>
      <Band>
        <path d="M0 40 Q80 4 170 34 T400 30 V72 H0Z" fill="#b9e6c6" />
        <path d="M0 58 Q110 26 230 52 T400 46 V72 H0Z" fill="#8fd8a6" />
        {[30, 95, 160, 250, 330, 375].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 58 : 62})`}>
            <rect x="-0.8" y="0" width="1.6" height="8" fill="#3f9a5c" />
            <circle cx="0" cy="0" r="3.6" fill={["#ff9eb5", "#ffd66b", "#c8b6ff"][i % 3]} />
            <circle cx="0" cy="0" r="1.4" fill="#fff" />
          </g>
        ))}
      </Band>
    </>
  );
}

function Sea() {
  return (
    <>
      <Corner className="top-2 -right-2" size={90}>
        <circle cx="55" cy="45" r="20" fill="#ffd66b" />
        <path d="M18 20q6-6 12 0q6-6 12 0" fill="none" stroke="#5a6a85" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 36q4-4 8 0q4-4 8 0" fill="none" stroke="#5a6a85" strokeWidth="2" strokeLinecap="round" />
      </Corner>
      <svg viewBox="0 0 120 40" width={120} height={40} className="absolute top-3 left-1/2 -translate-x-1/2 opacity-90">
        <Cloud x={34} y={18} s={0.85} />
      </svg>
      <Band>
        <path d="M0 26 Q25 16 50 26 T100 26 T150 26 T200 26 T250 26 T300 26 T350 26 T400 26 V72 H0Z" fill="#a9d4ff" />
        <path d="M0 44 Q25 34 50 44 T100 44 T150 44 T200 44 T250 44 T300 44 T350 44 T400 44 V72 H0Z" fill="#7fbfff" />
        {/* Sailboat */}
        <g transform="translate(300 6)">
          <path d="M0 24 H36 L30 32 H6Z" fill="#ff8f70" />
          <rect x="17" y="0" width="2" height="24" fill="#5a6a85" />
          <path d="M19 2 L34 22 H19Z" fill="#ffffff" />
          <path d="M17 6 L5 22 H17Z" fill="#fff1c9" />
        </g>
        {/* Fish */}
        {[
          [70, 58, "#ffc83d"],
          [190, 62, "#ff9eb5"],
        ].map(([x, y, c]) => (
          <g key={String(x)} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="0" rx="8" ry="4.5" fill={String(c)} />
            <path d="M7 0 L13 -4 V4Z" fill={String(c)} />
            <circle cx="-4" cy="-1" r="1" fill="#2b2d42" />
          </g>
        ))}
      </Band>
    </>
  );
}

function Space() {
  const stars = [
    [8, 12], [22, 30], [40, 8], [62, 18], [78, 6], [90, 26], [14, 52], [86, 48], [6, 78], [94, 74], [52, 90], [30, 70],
  ];
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        {stars.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.55} fill={i % 2 ? "#9b7bff" : "#ffc83d"} />
        ))}
      </svg>
      <Corner className="-top-2 -right-4" size={120}>
        <ellipse cx="50" cy="50" rx="44" ry="11" fill="none" stroke="#ffc83d" strokeWidth="4" transform="rotate(-18 50 50)" />
        <circle cx="50" cy="50" r="24" fill="#9b7bff" />
        <circle cx="42" cy="42" r="5" fill="#b8a3ff" />
        <circle cx="58" cy="58" r="3.5" fill="#b8a3ff" />
        <path d="M8 58 A44 11 -18 0 0 92 42" fill="none" stroke="#ffc83d" strokeWidth="4" transform="rotate(0 50 50)" />
      </Corner>
      <Corner className="top-28 right-5" size={40}>
        <circle cx="50" cy="50" r="34" fill="#fff1c9" />
        <circle cx="66" cy="40" r="30" fill="#e6e0ff" />
      </Corner>
      <Band>
        <path d="M0 50 Q100 30 200 46 T400 40 V72 H0Z" fill="#d6ccff" />
        {/* Rocket */}
        <g transform="translate(40 8) rotate(28)">
          <path d="M10 0 C20 10 20 26 16 34 H4 C0 26 0 10 10 0Z" fill="#ffffff" stroke="#9b7bff" strokeWidth="1.5" />
          <circle cx="10" cy="15" r="4" fill="#4fa8ff" />
          <path d="M4 26 L-3 36 L4 34Z M16 26 L23 36 L16 34Z" fill="#ff8f70" />
          <path d="M6 34 Q10 46 14 34Z" fill="#ffc83d" />
        </g>
        {[[150, 58], [260, 54], [340, 60]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="5" fill="#c4b6ff" />
        ))}
      </Band>
    </>
  );
}

function Mountain() {
  return (
    <>
      <Corner className="top-1 -right-2" size={84}>
        <circle cx="50" cy="50" r="22" fill="#ffc83d" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="48" y="12" width="4" height="10" rx="2" fill="#ffd66b" transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </Corner>
      <svg viewBox="0 0 120 40" width={120} height={40} className="absolute top-3 left-1/2 -translate-x-1/2 opacity-90">
        <Cloud x={40} y={18} s={0.8} />
        <Cloud x={92} y={24} s={0.55} />
      </svg>
      <Band>
        <path d="M0 72 L70 10 L140 72Z" fill="#e9b98f" />
        <path d="M70 10 L56 23 L64 21 L70 27 L77 21 L84 23Z" fill="#ffffff" />
        <path d="M110 72 L200 0 L290 72Z" fill="#f3cfb1" />
        <path d="M200 0 L182 15 L192 13 L200 20 L208 13 L218 15Z" fill="#ffffff" />
        <path d="M260 72 L340 18 L420 72Z" fill="#e9b98f" />
        {[[30, 60], [150, 62], [250, 58], [370, 62]].map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path d="M0 -14 L7 0 H-7Z M0 -8 L8 6 H-8Z" fill="#3f9a5c" />
            <rect x="-1.2" y="6" width="2.4" height="5" fill="#8a5a3b" />
          </g>
        ))}
        {/* Tent */}
        <g transform="translate(300 46)">
          <path d="M0 24 L16 0 L32 24Z" fill="#ff8f70" />
          <path d="M16 0 L12 24 H20Z" fill="#b4362a" />
        </g>
      </Band>
    </>
  );
}
