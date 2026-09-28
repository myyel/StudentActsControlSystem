import { ImageResponse } from "next/og";
import { STAR_PATH } from "@/components/app-icon";

// Notification badge (Android status bar): the OS uses only the alpha channel, so a colored
// square icon shows as a white block. White star on transparent.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={88} height={88} viewBox="0 0 24 24">
          <path fill="#ffffff" d={STAR_PATH} />
        </svg>
      </div>
    ),
    { width: 96, height: 96 },
  );
}
