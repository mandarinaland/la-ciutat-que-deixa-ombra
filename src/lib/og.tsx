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
    // no-store: la foto original pot passar de 2 MB i no s'ha de desar a la cache de dades.
    const res = await fetch(src, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) {
      console.error(`[og] Foto no disponible (${res.status})`);
      return null;
    }
    const input = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(input).rotate().resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (error) {
    console.error("[og] No s'ha pogut preparar la foto", error);
    return null; // sense foto, la targeta és només tipogràfica
  }
}

/** Prova les fotos per ordre (p. ex. portada → primera vinyeta) i torna la primera que funciona. */
async function firstPhoto(srcs: (string | null | undefined)[], width: number, height: number) {
  for (const src of srcs) {
    const img = await photoDataUrl(src, width, height);
    if (img) return img;
  }
  return null;
}

async function render(node: React.ReactElement) {
  // JPEG: les fotos pesen molt menys que en PNG.
  const png = await new ImageResponse(node, { ...OG_SIZE, fonts: await loadFonts() }).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": OG_CONTENT_TYPE, "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

/** Portada / capítol: text a l'esquerra, la fotografia sencera i ben visible a la dreta. */
export async function coverCard({
  title,
  subtitle,
  photos,
  eyebrow = "Auca",
}: {
  title: string;
  subtitle?: string | null;
  photos?: (string | null | undefined)[];
  eyebrow?: string;
}) {
  const photoW = 640;
  const img = await firstPhoto(photos ?? [], photoW, OG_SIZE.height);
  const textW = img ? OG_SIZE.width - photoW : OG_SIZE.width;
  const size = img ? (title.length > 18 ? 62 : 76) : title.length > 18 ? 84 : 100;
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", background: INK, color: PAPER }}>
      <div style={{ width: textW, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "60px 56px" }}>
        <div style={{ fontFamily: "Plex", fontSize: 18, letterSpacing: 5, color: SMOKE, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontFamily: "Garamond", fontSize: size, lineHeight: 1.02, letterSpacing: 4, textTransform: "uppercase", marginTop: 18 }}>
          {title}
        </div>
        {subtitle ? <div style={{ fontFamily: "Garamond", fontStyle: "italic", fontSize: 32, lineHeight: 1.2, color: "rgba(235,230,221,0.85)", marginTop: 22 }}>{subtitle}</div> : null}
      </div>
      {img ? <img src={img} width={photoW} height={OG_SIZE.height} alt="" /> : null}
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
  const img = await firstPhoto([photo], photoW, OG_SIZE.height);
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
