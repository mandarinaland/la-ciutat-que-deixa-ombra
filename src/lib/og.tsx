import "server-only";
/* eslint-disable @next/next/no-img-element -- next/og (satori) només entén <img>, no next/image */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

/**
 * Imatges per compartir (Open Graph / xarxes), 1200×630.
 * URL estable (no caduca com les URLs signades de Storage) i composició pròpia de l'obra.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/jpeg";

const INK = "#0d0d0c";
const PAPER = "#ebe6dd";
const SMOKE = "#9a948a";

const FONT_DIR = join(process.cwd(), "src/assets/og");
let fonts: Promise<{ name: string; data: Buffer; style: "normal" | "italic"; weight: 400 }[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "eb-garamond-latin-400-normal.woff")).then((data) => ({ name: "Garamond", data, style: "normal" as const, weight: 400 as const })),
    readFile(join(FONT_DIR, "eb-garamond-latin-400-italic.woff")).then((data) => ({ name: "Garamond", data, style: "italic" as const, weight: 400 as const })),
    readFile(join(FONT_DIR, "ibm-plex-mono-latin-400-normal.woff")).then((data) => ({ name: "Plex", data, style: "normal" as const, weight: 400 as const })),
  ]);
  return fonts;
}

/** Descarrega la foto i la converteix a JPEG retallat (qualsevol format d'entrada: AVIF, WEBP…). */
async function photoDataUrl(src: string | null | undefined, width: number, height: number): Promise<string | null> {
  if (!src) return null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(input).rotate().resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null; // sense foto, la targeta és només tipogràfica
  }
}

async function render(node: React.ReactElement) {
  // JPEG: les fotos pesen molt menys que en PNG.
  const png = await new ImageResponse(node, { ...OG_SIZE, fonts: await loadFonts() }).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": OG_CONTENT_TYPE, "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}

/** Portada: foto a sang, títol a baix. */
export async function coverCard({ title, subtitle, photo, eyebrow = "Auca" }: { title: string; subtitle?: string | null; photo?: string | null; eyebrow?: string }) {
  const img = await photoDataUrl(photo, OG_SIZE.width, OG_SIZE.height);
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, color: PAPER }}>
      {img ? <img src={img} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0, opacity: 0.75 }} alt="" /> : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "64px 72px",
          backgroundImage: `linear-gradient(to top, ${INK} 0%, rgba(13,13,12,0.6) 45%, rgba(13,13,12,0.05) 100%)`,
        }}
      >
        <div style={{ fontFamily: "Plex", fontSize: 20, letterSpacing: 5, color: SMOKE, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", maxWidth: 1000, fontFamily: "Garamond", fontSize: title.length > 18 ? 80 : 96, lineHeight: 1.02, letterSpacing: 5, textTransform: "uppercase", marginTop: 18 }}>
          {title}
        </div>
        {subtitle ? <div style={{ fontFamily: "Garamond", fontStyle: "italic", fontSize: 36, color: "rgba(235,230,221,0.85)", marginTop: 22 }}>{subtitle}</div> : null}
      </div>
    </div>,
  );
}

/** Vinyeta: foto a l'esquerra, número i veu a la dreta. */
export async function vignetteCard({
  work,
  number,
  title,
  text,
  chapter,
  photo,
}: {
  work: string;
  number: string;
  title?: string | null;
  text?: string | null;
  chapter?: string | null;
  photo?: string | null;
}) {
  const photoW = 700;
  const img = await photoDataUrl(photo, photoW, OG_SIZE.height);
  const line = text ? (text.length > 150 ? `${text.slice(0, 147).trimEnd()}…` : text) : "";
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", background: INK, color: PAPER }}>
      <div style={{ width: photoW, height: "100%", display: "flex", background: "#161614" }}>
        {img ? <img src={img} width={photoW} height={OG_SIZE.height} alt="" /> : null}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 52px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Plex", fontSize: 16, letterSpacing: 4, color: SMOKE, textTransform: "uppercase" }}>{work}</div>
          {chapter ? <div style={{ fontFamily: "Plex", fontSize: 16, letterSpacing: 4, color: SMOKE, textTransform: "uppercase", marginTop: 10 }}>{chapter}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Plex", fontSize: 72, color: PAPER }}>{number}</div>
          {title ? <div style={{ fontFamily: "Garamond", fontStyle: "italic", fontSize: 44, lineHeight: 1.1, marginTop: 14 }}>{title}</div> : null}
          {line ? <div style={{ fontFamily: "Garamond", fontSize: 26, lineHeight: 1.35, color: "rgba(235,230,221,0.8)", marginTop: 18 }}>{line}</div> : null}
        </div>
      </div>
    </div>,
  );
}
