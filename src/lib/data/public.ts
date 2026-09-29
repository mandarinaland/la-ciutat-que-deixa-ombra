import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  MEDIA_FIELDS,
  type MediaItem,
  type MediaLink,
  type PublicChapter,
  type PublicVignette,
  type PublicWork,
  type VignetteIndexEntry,
} from "./types";

/**
 * Lectures PÚBLIQUES. Client anònim (RLS: només publicat) + cache de Next.
 * Qualsevol canvi a l'administració invalida l'etiqueta CONTENT_TAG.
 */
export const CONTENT_TAG = "content";
const CACHE: { tags: string[]; revalidate: number } = { tags: [CONTENT_TAG], revalidate: 3600 };

const WORK_FIELDS =
  "id, slug, title, subtitle, intro_text, description, credit_photography, credit_text_voice, cover_media_id, updated_at";

export const getPublishedWork = unstable_cache(
  async (slug: string): Promise<PublicWork | null> => {
    const { data, error } = await createPublicClient()
      .from("works")
      .select(WORK_FIELDS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  ["public-work-v1"],
  CACHE,
);

export const getPublishedWorks = unstable_cache(
  async (): Promise<PublicWork[]> => {
    const { data, error } = await createPublicClient()
      .from("works")
      .select(WORK_FIELDS)
      .eq("status", "published")
      .order("order_index");
    if (error) throw error;
    return data ?? [];
  },
  ["public-works-v1"],
  CACHE,
);

export const getMediaById = unstable_cache(
  async (id: string): Promise<MediaItem | null> => {
    const { data, error } = await createPublicClient().from("media").select(MEDIA_FIELDS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  ["public-media-v1"],
  CACHE,
);

export const getPublishedChapters = unstable_cache(
  async (workId: string): Promise<PublicChapter[]> => {
    const { data, error } = await createPublicClient()
      .from("chapters")
      .select("id, slug, title, description, order_index")
      .eq("work_id", workId)
      .eq("status", "published")
      .order("order_index");
    if (error) throw error;
    return data ?? [];
  },
  ["public-chapters-v1"],
  CACHE,
);

/** Índex lleuger de totes les vinyetes publicades (navegació, capítols, sitemap). */
export const getVignetteIndex = unstable_cache(
  async (workId: string): Promise<VignetteIndexEntry[]> => {
    const { data, error } = await createPublicClient()
      .from("public_vignettes")
      .select("id, number, total, slug, title, chapter_id, updated_at")
      .eq("work_id", workId)
      .order("number");
    if (error) throw error;
    return data ?? [];
  },
  ["public-vignette-index-v1"],
  CACHE,
);

/** Fitxers de diverses vinyetes (la actual i la següent, per al preload). */
export const getMediaLinks = unstable_cache(
  async (vignetteIds: string[]): Promise<Record<string, MediaLink[]>> => {
    if (vignetteIds.length === 0) return {};
    const { data, error } = await createPublicClient()
      .from("vignette_media")
      .select(`id, vignette_id, role, position, media(${MEDIA_FIELDS})`)
      .in("vignette_id", vignetteIds)
      .order("position");
    if (error) throw error;
    const out: Record<string, MediaLink[]> = {};
    for (const row of data ?? []) {
      if (!row.media) continue;
      (out[row.vignette_id] ??= []).push({ id: row.id, role: row.role, position: row.position, media: row.media });
    }
    return out;
  },
  ["public-media-links-v1"],
  CACHE,
);

export const getPublicVignette = unstable_cache(
  async (workId: string, number: number): Promise<PublicVignette | null> => {
    const { data, error } = await createPublicClient()
      .from("public_vignettes")
      .select("*")
      .eq("work_id", workId)
      .eq("number", number)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const links = await getMediaLinks([data.id]);
    return { ...data, media: links[data.id] ?? [] };
  },
  ["public-vignette-v1"],
  CACHE,
);
