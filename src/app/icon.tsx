import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/app-icon";

const SIZES = [192, 512];

// Served at /icon/192 and /icon/512 (manifest, service worker notifications).
export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  return new ImageResponse(<AppIconArt size={size} />, { width: size, height: size });
}
