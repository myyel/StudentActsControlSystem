import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  stage: { name: string; assetUrl: string };
  size: number;
  className?: string;
  /** Decorative when the name is already written next to it. */
  decorative?: boolean;
};

/** A character stage picture (original SVG; SVGs are served unoptimized). */
export function CharacterImage({ stage, size, className, decorative }: Props) {
  return (
    <Image
      src={stage.assetUrl}
      alt={decorative ? "" : stage.name}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
