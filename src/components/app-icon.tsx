export const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

const INK = "#2b2d42";

/**
 * Original app mark, "Durak yolu": a dotted path through two stations up to a star. Plain SVG with
 * literal colours so it also renders in next/og. `tile` adds the ink rounded square; leave it off
 * on the ink top bar, where the path sits directly on the bar.
 */
export function LogoMark({ tile = false, ...props }: { tile?: boolean | "full" } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" {...props}>
      {/* "full": square corners, for icons the OS masks itself. */}
      {tile && <rect width="120" height="120" rx={tile === "full" ? 0 : 28} fill={INK} />}
      <path
        d="M28 94 C64 94 72 74 52 64 C32 54 46 36 82 34"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="0.1 11"
      />
      <circle cx="28" cy="94" r="10" fill="#2dbe7e" />
      <circle cx="52" cy="64" r="10" fill="#4fa8ff" />
      <polygon
        transform="translate(86 33) scale(1.05)"
        points="0,-17 4.41,-6.07 16.17,-5.25 7.13,2.32 9.99,13.75 0,7.5 -9.99,13.75 -7.13,2.32 -16.17,-5.25 -4.41,-6.07"
        fill="#ffc83d"
        stroke="#ffc83d"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The mark on a full ink square, drawn for next/og; used by icon.tsx and apple-icon.tsx.
export function AppIconArt({ size }: { size: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: INK }}>
      {/* The art spans 15–87% of the box, inside the central 80% maskable icons keep. */}
      <LogoMark tile="full" width={size} height={size} />
    </div>
  );
}
