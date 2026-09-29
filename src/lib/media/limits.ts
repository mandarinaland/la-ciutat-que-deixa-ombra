/**
 * Tipus de fitxer admesos i límits.
 * Segur per a client i servidor (sense dependències de servidor).
 *
 * Tres capes de protecció:
 *  1. El navegador valida abans de pujar (resposta immediata).
 *  2. El servidor revalida abans d'emetre la URL de pujada i en finalitzar.
 *  3. El bucket de Supabase té `file_size_limit` i `allowed_mime_types` (migració 0003).
 */
export type MediaKind = "image" | "audio" | "video";

export const BUCKET_FOR: Record<MediaKind, "images" | "audio" | "video"> = {
  image: "images",
  audio: "audio",
  video: "video",
};

/** Límit dur de cada bucket (ha de coincidir amb la migració de Storage). */
export const BUCKET_MAX_BYTES: Record<MediaKind, number> = {
  image: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

export const ALLOWED: Record<MediaKind, { mimes: string[]; extensions: string[]; label: string }> = {
  image: {
    mimes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
    label: "JPG, PNG, WEBP, AVIF",
  },
  audio: {
    mimes: [
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave",
      "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac", "audio/ogg", "application/ogg",
    ],
    extensions: ["mp3", "wav", "m4a", "ogg"],
    label: "MP3, WAV, M4A, OGG",
  },
  video: {
    mimes: ["video/mp4", "video/webm"],
    extensions: ["mp4", "webm"],
    label: "MP4, WEBM",
  },
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
};

export type UploadLimits = Record<MediaKind, { maxBytes: number }>;

export const DEFAULT_LIMITS: UploadLimits = {
  image: { maxBytes: BUCKET_MAX_BYTES.image },
  audio: { maxBytes: BUCKET_MAX_BYTES.audio },
  video: { maxBytes: BUCKET_MAX_BYTES.video },
};

export function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(filename.trim());
  return m ? m[1]!.toLowerCase() : "";
}

/** Alguns navegadors no informen del tipus (p. ex. .m4a): el deduïm de l'extensió. */
export function resolveMime(filename: string, reportedType: string): string {
  const t = (reportedType || "").toLowerCase().trim();
  if (t) return t;
  return MIME_BY_EXTENSION[extensionOf(filename)] ?? "";
}

export function kindOfMime(mime: string): MediaKind | null {
  for (const kind of ["image", "audio", "video"] as const) if (ALLOWED[kind].mimes.includes(mime)) return kind;
  return null;
}

export type FileCheck = { ok: true; kind: MediaKind; mime: string } | { ok: false; error: string };

export function checkFile(
  file: { name: string; type: string; size: number },
  limits: UploadLimits,
  expected?: MediaKind,
): FileCheck {
  const mime = resolveMime(file.name, file.type);
  const kind = kindOfMime(mime);
  if (!kind) return { ok: false, error: `Format no admès (${extensionOf(file.name) || mime || "desconegut"}).` };
  if (expected && kind !== expected) {
    return { ok: false, error: `Aquí cal ${expected === "image" ? "una imatge" : expected === "audio" ? "un àudio" : "un vídeo"} (${ALLOWED[expected].label}).` };
  }
  if (!ALLOWED[kind].extensions.includes(extensionOf(file.name))) {
    return { ok: false, error: `Extensió no admesa. Formats: ${ALLOWED[kind].label}.` };
  }
  if (file.size <= 0) return { ok: false, error: "El fitxer és buit." };
  const max = Math.min(limits[kind].maxBytes, BUCKET_MAX_BYTES[kind]);
  if (file.size > max) return { ok: false, error: `Massa gran: màxim ${Math.round(max / 1024 / 1024)} MB.` };
  return { ok: true, kind, mime };
}

/** Nom net per mostrar: sense camins ni caràcters de control. */
export function cleanFilename(name: string): string {
  return name.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200) || "fitxer";
}
