import type { Enums, Tables, Views } from "@/types/database";

/** Camps de `media` que necessita qualsevol vista (mai tot el registre). */
export const MEDIA_FIELDS =
  "id, filename, size, media_type, mime_type, width, height, duration, alt_text, provider, provider_asset_id, bucket, storage_path, public_url" as const;

export type MediaItem = Pick<
  Tables<"media">,
  | "id"
  | "filename"
  | "size"
  | "media_type"
  | "mime_type"
  | "width"
  | "height"
  | "duration"
  | "alt_text"
  | "provider"
  | "provider_asset_id"
  | "bucket"
  | "storage_path"
  | "public_url"
>;

export type MediaLink = { id: string; role: Enums<"media_role">; position: number; media: MediaItem };

export type PublicWork = Pick<
  Tables<"works">,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "intro_text"
  | "hero_quote"
  | "description"
  | "credit_photography"
  | "credit_text_voice"
  | "cover_media_id"
  | "updated_at"
>;

export type PublicChapter = Pick<Tables<"chapters">, "id" | "slug" | "title" | "description" | "order_index">;

/** Entrada lleugera per a navegació, índexs i sitemap. */
export type VignetteIndexEntry = Pick<
  Views<"public_vignettes">,
  "id" | "number" | "total" | "slug" | "title" | "chapter_id" | "updated_at"
>;

export type PublicVignette = Views<"public_vignettes"> & { media: MediaLink[] };

export function pickMedia(links: MediaLink[], role: Enums<"media_role">): MediaItem | null {
  return links.filter((l) => l.role === role).sort((a, b) => a.position - b.position)[0]?.media ?? null;
}
