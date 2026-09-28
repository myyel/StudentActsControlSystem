export const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

// Original app mark (a star on green) drawn for next/og, used by icon.tsx and apple-icon.tsx.
export function AppIconArt({ size }: { size: number }) {
  // Maskable icons need the art inside the central 80%.
  const star = Math.round(size * 0.56);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#059669",
      }}
    >
      <svg width={star} height={star} viewBox="0 0 24 24">
        <path fill="#fde047" d={STAR_PATH} />
      </svg>
    </div>
  );
}
