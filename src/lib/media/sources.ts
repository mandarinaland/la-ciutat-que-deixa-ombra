import "server-only";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Abstracció de la font d'un fitxer multimèdia.
 *
 * Els components (reproductor, <Image>) reben un `MediaSource` i no saben d'on ve:
 * avui Supabase Storage; demà Mux o Cloudflare Stream per al vídeo, sense tocar-los.
 */
export type MediaSource =
  | { kind: "file"; url: string; mimeType: string } // imatge, àudio o vídeo progressiu (HTTP Range)
  | { kind: "hls"; url: string; mimeType: "application/vnd.apple.mpegurl" }; // streaming adaptatiu

type MediaLike = Pick<
  Tables<"media">,
  "id" | "provider" | "provider_asset_id" | "bucket" | "storage_path" | "public_url" | "mime_type"
>;

/** Validesa de les URLs signades i durada de la cache que les reutilitza. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dies
const SIGNED_URL_CACHE_SECONDS = 60 * 60 * 24 * 6; // es renoven 1 dia abans de caducar
const PREVIEW_URL_TTL_SECONDS = 60 * 60; // previsualització d'admin: 1 hora, sense cache

export const MEDIA_URLS_TAG = "media-urls";

/**
 * Signa un lot de camins d'un bucket amb el client ANÒNIM.
 * La política de Storage només ho permet si el fitxer és de contingut publicat:
 * un esborrany no rep mai URL pública, encara que algú ho intenti.
 */
async function signPublic(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl && !item.error) out[item.path] = item.signedUrl;
  return out;
}

/** Error intern: no volem cachejar un resultat incomplet (p. ex. un fitxer encara no publicat). */
class IncompleteSigning extends Error {
  constructor(readonly partial: Record<string, string>) {
    super("incomplete-signing");
  }
}

async function signPublicStrict(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const urls = await signPublic(bucket, paths);
  if (Object.keys(urls).length !== paths.length) throw new IncompleteSigning(urls);
  return urls;
}

/**
 * Cache per (bucket, camins). La mateixa URL es reutilitza durant ~6 dies, de manera
 * que next/image i la CDN de Vercel poden cachejar la imatge optimitzada.
 * Només es cacheja si TOTS els camins s'han pogut signar.
 */
const signPublicCached = unstable_cache(signPublicStrict, ["signed-media-urls-v1"], {
  revalidate: SIGNED_URL_CACHE_SECONDS,
  tags: [MEDIA_URLS_TAG],
});

async function getPublicUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  try {
    return await signPublicCached(bucket, paths);
  } catch (error) {
    if (error instanceof IncompleteSigning) return error.partial;
    throw error;
  }
}

async function signWith(
  client: SupabaseClient<Database>,
  bucket: string,
  paths: string[],
): Promise<Record<string, string>> {
  const { data, error } = await client.storage.from(bucket).createSignedUrls(paths, PREVIEW_URL_TTL_SECONDS);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl && !item.error) out[item.path] = item.signedUrl;
  return out;
}

function externalSource(m: MediaLike): MediaSource | null {
  switch (m.provider) {
    case "mux":
      return m.provider_asset_id
        ? { kind: "hls", url: `https://stream.mux.com/${m.provider_asset_id}.m3u8`, mimeType: "application/vnd.apple.mpegurl" }
        : null;
    case "cloudflare_stream": {
      const code = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
      return code && m.provider_asset_id
        ? {
            kind: "hls",
            url: `https://customer-${code}.cloudflarestream.com/${m.provider_asset_id}/manifest/video.m3u8`,
            mimeType: "application/vnd.apple.mpegurl",
          }
        : null;
    }
    case "external":
      return m.public_url ? { kind: "file", url: m.public_url, mimeType: m.mime_type } : null;
    default:
      return null;
  }
}

/**
 * Resol les fonts d'una llista de fitxers.
 *  · mode "public": client anònim + cache (només contingut publicat).
 *  · mode "preview": client de sessió de l'admin, URLs curtes, sense cache (inclou esborranys).
 */
export async function resolveMediaSources(
  media: MediaLike[],
  options: { mode: "public" } | { mode: "preview"; client: SupabaseClient<Database> } = { mode: "public" },
): Promise<Map<string, MediaSource>> {
  const result = new Map<string, MediaSource>();
  const byBucket = new Map<string, MediaLike[]>();

  for (const m of media) {
    if (m.provider !== "supabase") {
      const src = externalSource(m);
      if (src) result.set(m.id, src);
      continue;
    }
    if (m.public_url) {
      result.set(m.id, { kind: "file", url: m.public_url, mimeType: m.mime_type });
      continue;
    }
    if (!m.bucket || !m.storage_path) continue;
    const list = byBucket.get(m.bucket) ?? [];
    list.push(m);
    byBucket.set(m.bucket, list);
  }

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, items]) => {
      const paths = [...new Set(items.map((i) => i.storage_path!))].sort();
      const urls =
        options.mode === "public" ? await getPublicUrls(bucket, paths) : await signWith(options.client, bucket, paths);
      for (const item of items) {
        const url = urls[item.storage_path!];
        if (url) result.set(item.id, { kind: "file", url, mimeType: item.mime_type });
      }
    }),
  );

  return result;
}
