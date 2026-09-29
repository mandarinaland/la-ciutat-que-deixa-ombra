import Image from "next/image";
import type { MediaSource } from "@/lib/media/sources";
import type { MediaItem } from "@/lib/data/types";

/** Miniatura d'admin: next/image demana la mida petita, mai l'original. */
export function Thumb({ media, source, size = 64 }: { media: MediaItem | null; source?: MediaSource; size?: number }) {
  const box = { width: size, height: size };
  if (!media || !source || source.kind !== "file") {
    return (
      <div style={box} className="flex shrink-0 items-center justify-center border border-dashed border-line font-mono text-[10px] text-smoke/60">
        sense foto
      </div>
    );
  }
  return (
    <div style={box} className="relative shrink-0 overflow-hidden bg-ink-soft">
      <Image
        src={source.url}
        alt={media.alt_text ?? ""}
        fill
        sizes={`${size}px`}
        quality={60}
        unoptimized={source.stable === false}
        className="object-cover"
      />
    </div>
  );
}
