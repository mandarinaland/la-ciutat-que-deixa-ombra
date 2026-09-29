import "server-only";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { createPublicClient } from "@/lib/supabase/public";
import { resolveMediaSources, type MediaSource } from "@/lib/media/sources";
import { DEFAULT_WORK_SLUG } from "@/lib/env";
import { routes } from "@/lib/routing";
import { CONTENT_TAG } from "./public";
import { MEDIA_FIELDS, pickMedia, type MediaItem, type MediaLink } from "./types";

/**
 * Dades de l'experiència pública (portada, recorregut, lectura de l'auca).
 *
 * Dos modes amb EXACTAMENT els mateixos components:
 *  · "public"  → client anònim + cache (RLS: només publicat).
 *  · "preview" → sessió d'administrador, inclou esborranys (mai cachejat).
 *    Només s'invoca des de /admin/preview, després de requireAdmin().
 */
export type AucaMode = "public" | "preview";

type Client = SupabaseClient<Database>;
type VignetteRow = Database["public"]["Views"]["public_vignettes"]["Row"];

export type AucaImage = { src: string; width: number; height: number; alt: string; stable: boolean };
export type AucaFile = { id: string; src: string; mimeType: string; duration: number | null };

export type AucaHrefs = {
  home: string;
  journey: string;
  vignette: (n: number) => string;
  chapter: (slug: string) => string;
};

export function hrefsFor(mode: AucaMode, workSlug: string): AucaHrefs {
  if (mode === "preview") {
    const base = routes.admin.preview(workSlug);
    return {
      home: base,
      journey: `${base}#recorregut`,
      vignette: (n) => routes.admin.preview(workSlug, n),
      chapter: (slug) => routes.admin.preview(workSlug, slug),
    };
  }
  const home = workSlug === DEFAULT_WORK_SLUG ? routes.home() : routes.work(workSlug);
  return {
    home,
    journey: `${home}#recorregut`,
    vignette: (n) => routes.vignette(workSlug, n),
    chapter: (slug) => routes.chapter(workSlug, slug),
  };
}

// ── Consultes (idèntiques per als dos modes; canvia el client i la vista) ──────────

type WorkRow = Pick<
  Tables<"works">,
  "id" | "slug" | "title" | "subtitle" | "intro_text" | "hero_quote" | "description" | "credit_photography" | "credit_text_voice" | "cover_media_id" | "intro_audio_media_id" | "status" | "updated_at"
>;
type ChapterRow = Pick<Tables<"chapters">, "id" | "slug" | "title" | "description" | "order_index" | "status">;
type IndexRow = Pick<VignetteRow, "id" | "number" | "total" | "title" | "chapter_id" | "piath_text" | "status">;

const WORK_FIELDS =
  "id, slug, title, subtitle, intro_text, hero_quote, description, credit_photography, credit_text_voice, cover_media_id, intro_audio_media_id, status, updated_at";

async function qWork(db: Client, slug: string, mode: AucaMode): Promise<WorkRow | null> {
  let q = db.from("works").select(WORK_FIELDS).eq("slug", slug);
  if (mode === "public") q = q.eq("status", "published");
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

async function qMedia(db: Client, id: string): Promise<MediaItem | null> {
  const { data, error } = await db.from("media").select(MEDIA_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function qChapters(db: Client, workId: string, mode: AucaMode): Promise<ChapterRow[]> {
  let q = db.from("chapters").select("id, slug, title, description, order_index, status").eq("work_id", workId);
  q = mode === "public" ? q.eq("status", "published") : q.neq("status", "archived");
  const { data, error } = await q.order("order_index");
  if (error) throw error;
  return data ?? [];
}

const view = (mode: AucaMode) => (mode === "public" ? "public_vignettes" : "preview_vignettes");

async function qIndex(db: Client, workId: string, mode: AucaMode): Promise<IndexRow[]> {
  const { data, error } = await db
    .from(view(mode))
    .select("id, number, total, title, chapter_id, piath_text, status")
    .eq("work_id", workId)
    .order("number");
  if (error) throw error;
  return data ?? [];
}

/** Fotografia principal de TOTES les vinyetes d'una obra (una sola consulta, sense llistes d'ids). */
async function qMainImages(db: Client, workId: string): Promise<Record<string, MediaItem>> {
  const { data, error } = await db
    .from("vignette_media")
    .select(`vignette_id, media(${MEDIA_FIELDS}), vignettes!inner(work_id)`)
    .eq("role", "main_image")
    .eq("vignettes.work_id", workId);
  if (error) throw error;
  const out: Record<string, MediaItem> = {};
  for (const row of (data ?? []) as unknown as { vignette_id: string; media: MediaItem | null }[]) {
    if (row.media) out[row.vignette_id] = row.media;
  }
  return out;
}

async function qVignette(db: Client, workId: string, number: number, mode: AucaMode): Promise<VignetteRow | null> {
  const { data, error } = await db.from(view(mode)).select("*").eq("work_id", workId).eq("number", number).maybeSingle();
  if (error) throw error;
  return data;
}

async function qLinks(db: Client, vignetteId: string): Promise<MediaLink[]> {
  const { data, error } = await db
    .from("vignette_media")
    .select(`id, role, position, media(${MEDIA_FIELDS})`)
    .eq("vignette_id", vignetteId)
    .order("position");
  if (error) throw error;
  return (data ?? []).flatMap((r) => (r.media ? [{ id: r.id, role: r.role, position: r.position, media: r.media }] : []));
}

// Versions públiques cachejades (etiqueta `content`: qualsevol canvi a l'admin les invalida).
const CACHE = { tags: [CONTENT_TAG], revalidate: 3600 };
const pub = () => createPublicClient();
const cWork = unstable_cache((slug: string) => qWork(pub(), slug, "public"), ["auca-work-v3"], CACHE);
const cMedia = unstable_cache((id: string) => qMedia(pub(), id), ["auca-media-v1"], CACHE);
const cChapters = unstable_cache((workId: string) => qChapters(pub(), workId, "public"), ["auca-chapters-v1"], CACHE);
const cIndex = unstable_cache((workId: string) => qIndex(pub(), workId, "public"), ["auca-index-v1"], CACHE);
const cMainImages = unstable_cache((workId: string) => qMainImages(pub(), workId), ["auca-main-images-v1"], CACHE);
const cVignette = unstable_cache((workId: string, n: number) => qVignette(pub(), workId, n, "public"), ["auca-vignette-v1"], CACHE);
const cLinks = unstable_cache((vignetteId: string) => qLinks(pub(), vignetteId), ["auca-links-v1"], CACHE);

type Source = {
  work: (slug: string) => Promise<WorkRow | null>;
  media: (id: string) => Promise<MediaItem | null>;
  chapters: (workId: string) => Promise<ChapterRow[]>;
  index: (workId: string) => Promise<IndexRow[]>;
  mainImages: (workId: string) => Promise<Record<string, MediaItem>>;
  vignette: (workId: string, n: number) => Promise<VignetteRow | null>;
  links: (vignetteId: string) => Promise<MediaLink[]>;
};

async function sourceFor(mode: AucaMode): Promise<Source> {
  if (mode === "public") {
    return { work: cWork, media: cMedia, chapters: cChapters, index: cIndex, mainImages: cMainImages, vignette: cVignette, links: cLinks };
  }
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const db = await createSupabaseServerClient();
  return {
    work: (slug) => qWork(db, slug, mode),
    media: (id) => qMedia(db, id),
    chapters: (workId) => qChapters(db, workId, mode),
    index: (workId) => qIndex(db, workId, mode),
    mainImages: (workId) => qMainImages(db, workId),
    vignette: (workId, n) => qVignette(db, workId, n, mode),
    links: (vignetteId) => qLinks(db, vignetteId),
  };
}

// ── Transformacions ─────────────────────────────────────────────────────────────

function toImage(m: MediaItem | null, sources: Map<string, MediaSource>, fallbackAlt = ""): AucaImage | null {
  if (!m) return null;
  const s = sources.get(m.id);
  if (!s || s.kind !== "file") return null;
  return {
    src: s.url,
    width: m.width ?? 1600,
    height: m.height ?? 1067,
    alt: m.alt_text?.trim() || fallbackAlt,
    stable: s.stable !== false,
  };
}

function toFile(m: MediaItem | null, sources: Map<string, MediaSource>): AucaFile | null {
  if (!m) return null;
  const s = sources.get(m.id);
  if (!s) return null;
  return { id: m.id, src: s.url, mimeType: s.mimeType, duration: m.duration === null ? null : Number(m.duration) };
}

/** Primera frase (o línia) del text de Piath, per a índexs i metadades. */
export function excerpt(text: string | null | undefined, max = 110): string {
  if (!text) return "";
  const first = text.trim().split(/\n+/)[0] ?? "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
export function roman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

// ── Portada + recorregut ───────────────────────────────────────────────────────

export type AucaWork = Omit<WorkRow, "cover_media_id" | "intro_audio_media_id">;

export type JourneyItem = {
  number: number;
  title: string | null;
  excerpt: string;
  image: AucaImage | null;
  draft: boolean;
};

export type JourneySection = {
  chapter: { slug: string; title: string; description: string | null; numeral: string; draft: boolean } | null;
  items: JourneyItem[];
};

export type Landing = {
  work: AucaWork;
  cover: AucaImage | null;
  /** Poema de la portada (àudio de fons). */
  poem: AucaFile | null;
  total: number;
  sections: JourneySection[];
};

export async function loadLanding(mode: AucaMode, workSlug: string): Promise<Landing | null> {
  const src = await sourceFor(mode);
  const work = await src.work(workSlug);
  if (!work) return null;

  const [coverMedia, poemMedia, chapters, index, mainImages] = await Promise.all([
    work.cover_media_id ? src.media(work.cover_media_id) : Promise.resolve(null),
    work.intro_audio_media_id ? src.media(work.intro_audio_media_id) : Promise.resolve(null),
    src.chapters(work.id),
    src.index(work.id),
    src.mainImages(work.id),
  ]);

  const media = [coverMedia, poemMedia, ...index.map((v) => mainImages[v.id] ?? null)].filter((m): m is MediaItem => Boolean(m));
  const sources = await resolveMediaSources(media, mode === "preview" ? "admin" : "public");

  const toItem = (v: IndexRow): JourneyItem => ({
    number: v.number,
    title: v.title,
    excerpt: excerpt(v.piath_text),
    image: toImage(mainImages[v.id] ?? null, sources, v.title ?? `Vinyeta ${v.number}`),
    draft: v.status !== "published",
  });

  // Seccions en l'ordre de lectura: un capítol comença on apareix la seva primera vinyeta.
  const chapterById = new Map(chapters.map((c, i) => [c.id, { c, numeral: roman(i + 1) }]));
  const sections: JourneySection[] = [];
  let lastKey: string | null | undefined = undefined; // undefined = encara cap secció
  for (const v of index) {
    const ch = v.chapter_id ? chapterById.get(v.chapter_id) : undefined;
    const key = ch ? ch.c.id : null;
    const last = sections.at(-1);
    if (last && lastKey === key) {
      last.items.push(toItem(v));
    } else {
      lastKey = key;
      sections.push({
        chapter: ch
          ? { slug: ch.c.slug, title: ch.c.title, description: ch.c.description, numeral: ch.numeral, draft: ch.c.status !== "published" }
          : null,
        items: [toItem(v)],
      });
    }
  }

  const { cover_media_id: _cover, intro_audio_media_id: _poem, ...rest } = work;
  void _cover;
  void _poem;
  return {
    work: rest,
    cover: toImage(coverMedia, sources, work.title),
    poem: toFile(poemMedia, sources),
    total: index.length,
    sections,
  };
}

// ── Capítol ───────────────────────────────────────────────────────────────────

export type ChapterView = {
  work: AucaWork;
  chapter: NonNullable<JourneySection["chapter"]>;
  items: JourneyItem[];
  total: number;
};

export async function loadChapter(mode: AucaMode, workSlug: string, chapterSlug: string): Promise<ChapterView | null> {
  const landing = await loadLanding(mode, workSlug);
  if (!landing) return null;
  const sections = landing.sections.filter((s) => s.chapter?.slug === chapterSlug);
  if (sections.length > 0) {
    return { work: landing.work, chapter: sections[0]!.chapter!, items: sections.flatMap((s) => s.items), total: landing.total };
  }
  // Capítol publicat però encara sense vinyetes.
  const src = await sourceFor(mode);
  const work = await src.work(workSlug);
  if (!work) return null;
  const chapters = await src.chapters(work.id);
  const i = chapters.findIndex((c) => c.slug === chapterSlug);
  if (i < 0) return null;
  const c = chapters[i]!;
  return {
    work: landing.work,
    chapter: { slug: c.slug, title: c.title, description: c.description, numeral: roman(i + 1), draft: c.status !== "published" },
    items: [],
    total: landing.total,
  };
}

export async function listChaptersFor(mode: AucaMode, workSlug: string) {
  const landing = await loadLanding(mode, workSlug);
  if (!landing) return null;
  const seen = new Map<string, { chapter: NonNullable<JourneySection["chapter"]>; count: number; first: number }>();
  for (const s of landing.sections) {
    if (!s.chapter) continue;
    const e = seen.get(s.chapter.slug);
    if (e) e.count += s.items.length;
    else seen.set(s.chapter.slug, { chapter: s.chapter, count: s.items.length, first: s.items[0]?.number ?? 0 });
  }
  return { work: landing.work, chapters: [...seen.values()] };
}

// ── Lectura d'una vinyeta ────────────────────────────────────────────────────────

export type ReaderVignette = {
  work: AucaWork;
  number: number;
  total: number;
  title: string | null;
  text: string | null;
  caption: string | null;
  photographer: string | null;
  photoDate: string | null;
  location: string | null;
  draft: boolean;
  chapter: { slug: string; title: string; numeral: string } | null;
  image: AucaImage | null;
  voice: AucaFile | null;
  ambient: AucaFile | null;
  video: AucaFile | null;
  poster: AucaImage | null;
  nextImage: AucaImage | null;
  updatedAt: string;
};

export async function loadVignette(mode: AucaMode, workSlug: string, number: number): Promise<ReaderVignette | null> {
  const src = await sourceFor(mode);
  const work = await src.work(workSlug);
  if (!work) return null;
  const v = await src.vignette(work.id, number);
  if (!v) return null;

  const [links, next, chapters] = await Promise.all([
    src.links(v.id),
    number < v.total ? src.vignette(work.id, number + 1) : Promise.resolve(null),
    v.chapter_id ? src.chapters(work.id) : Promise.resolve([]),
  ]);
  const nextLinks = next ? await src.links(next.id) : [];

  const main = pickMedia(links, "main_image");
  const voice = pickMedia(links, "audio_piath");
  const ambient = pickMedia(links, "ambient_audio");
  const video = pickMedia(links, "video");
  const poster = pickMedia(links, "video_poster");
  const nextMain = pickMedia(nextLinks, "main_image");

  const all = [main, voice, ambient, video, poster, nextMain].filter((m): m is MediaItem => Boolean(m));
  const sources = await resolveMediaSources(all, mode === "preview" ? "admin" : "public");

  const ci = v.chapter_id ? chapters.findIndex((c) => c.id === v.chapter_id) : -1;
  const chapter = ci >= 0 ? { slug: chapters[ci]!.slug, title: chapters[ci]!.title, numeral: roman(ci + 1) } : null;

  const { cover_media_id: _cover, intro_audio_media_id: _poem, ...rest } = work;
  void _cover;
  void _poem;
  return {
    work: rest,
    number: v.number,
    total: v.total,
    title: v.title,
    text: v.piath_text,
    caption: v.caption,
    photographer: v.photographer,
    photoDate: v.photo_date,
    location: v.location,
    draft: v.status !== "published",
    chapter,
    image: toImage(main, sources, v.title ?? `Vinyeta ${v.number}`),
    voice: toFile(voice, sources),
    ambient: toFile(ambient, sources),
    video: toFile(video, sources),
    poster: toImage(poster, sources),
    nextImage: toImage(nextMain, sources),
    updatedAt: v.updated_at,
  };
}
