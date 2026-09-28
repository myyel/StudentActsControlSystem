import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home screen icon on iOS ("Ana Ekrana Ekle").
export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={180} />, size);
}
