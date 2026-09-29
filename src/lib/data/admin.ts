import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { MEDIA_FIELDS, type MediaLink } from "./types";

/**
 * Lectures d'ADMINISTRACIÓ: client amb la sessió de l'admin (RLS: ho veu tot).
 * Sense cache: l'admin sempre veu l'estat real.
 * Qui crida aquestes funcions ja ha passat per requireAdmin() (layout del panell).
 */

export const CURRENT_WORK_COOKIE = "admin_work";

export type AdminWork = Tables<"works">;

export async function listWorks(): Promise<AdminWork[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("works").select("*").order("order_index").order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Obra amb què treballa l'admin (cookie) o, per defecte, la primera. */
export async function getCurrentWork(): Promise<AdminWork | null> {
  const [works, store] = await Promise.all([listWorks(), cookies()]);
  const selected = store.get(CURRENT_WORK_COOKIE)?.value;
  return works.find((w) => w.id === selected) ?? works[0] ?? null;
}

export type AdminChapter = Tables<"chapters"> & { vignette_count: number };

export async function listChapters(workId: string): Promise<AdminChapter[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*, vignettes(count)")
    .eq("work_id", workId)
    .order("order_index");
  if (error) throw error;
  return (data ?? []).map(({ vignettes, ...c }) => ({ ...c, vignette_count: vignettes?.[0]?.count ?? 0 }));
}

export type AdminVignetteRow = Pick<
  Tables<"vignettes">,
  "id" | "order_index" | "slug" | "title" | "status" | "chapter_id" | "updated_at" | "piath_text"
> & { position: number; main_image: MediaLink["media"] | null };

export type VignetteListFilter = {
  status?: Tables<"vignettes">["status"];
  chapterId?: string | "none";
  q?: string;
  page?: number;
  pageSize?: number;
};

export type VignetteList = { rows: AdminVignetteRow[]; total: number; filtered: number; page: number; pages: number };

/**
 * Llista paginada. La posició (01, 02…) es calcula sobre l'ordre complet de l'obra,
 * i només es carreguen les fotografies de la pàgina visible.
 */
export async function listVignettes(workId: string, filter: VignetteListFilter = {}): Promise<VignetteList> {
  const supabase = await createSupabaseServerClient();
  const pageSize = filter.pageSize ?? 60;

  const { data, error } = await supabase
    .from("vignettes")
    .select("id, order_index, slug, title, status, chapter_id, updated_at, piath_text")
    .eq("work_id", workId)
    .order("order_index");
  if (error) throw error;

  const all = (data ?? []).map((v, i) => ({ ...v, position: i + 1 }));
  const q = filter.q?.trim().toLowerCase();
  const filtered = all.filter(
    (v) =>
      (!filter.status || v.status === filter.status) &&
      (!filter.chapterId || (filter.chapterId === "none" ? v.chapter_id === null : v.chapter_id === filter.chapterId)) &&
      (!q || [v.title, v.slug, v.piath_text].some((t) => t?.toLowerCase().includes(q))),
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, filter.page ?? 1), pages);
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  const images = new Map<string, MediaLink["media"]>();
  if (slice.length) {
    const { data: links, error: linkError } = await supabase
      .from("vignette_media")
      .select(`vignette_id, media(${MEDIA_FIELDS})`)
      .in("vignette_id", slice.map((v) => v.id))
      .eq("role", "main_image");
    if (linkError) throw linkError;
    for (const l of links ?? []) if (l.media) images.set(l.vignette_id, l.media);
  }

  return {
    rows: slice.map((v) => ({ ...v, main_image: images.get(v.id) ?? null })),
    total: all.length,
    filtered: filtered.length,
    page,
    pages,
  };
}

/** Veïnes per navegar dins de l'editor (anterior / següent segons l'ordre). */
export async function getVignetteNeighbours(workId: string, orderIndex: number) {
  const supabase = await createSupabaseServerClient();
  const [prev, next] = await Promise.all([
    supabase.from("vignettes").select("id").eq("work_id", workId).lt("order_index", orderIndex).order("order_index", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("vignettes").select("id").eq("work_id", workId).gt("order_index", orderIndex).order("order_index").limit(1).maybeSingle(),
  ]);
  return { prevId: prev.data?.id ?? null, nextId: next.data?.id ?? null };
}

export type AdminVignette = Tables<"vignettes"> & { media: MediaLink[]; number: number; total: number };

export async function getVignette(id: string): Promise<AdminVignette | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vignettes")
    .select(`*, vignette_media(id, role, position, media(${MEDIA_FIELDS}))`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { vignette_media, ...vignette } = data;
  // Posició dins de l'obra (mateix criteri que la llista) per mostrar "07 / 49".
  const [{ count: before }, { count: total }] = await Promise.all([
    supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("work_id", vignette.work_id).lt("order_index", vignette.order_index),
    supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("work_id", vignette.work_id),
  ]);

  return {
    ...vignette,
    number: (before ?? 0) + 1,
    total: total ?? 0,
    media: (vignette_media ?? [])
      .filter((l): l is typeof l & { media: NonNullable<typeof l.media> } => Boolean(l.media))
      .map((l) => ({ id: l.id, role: l.role, position: l.position, media: l.media })),
  };
}

export type DashboardStats = {
  works: number;
  chapters: number;
  vignettes: number;
  drafts: number;
  published: number;
  archived: number;
  images: number;
  audio: number;
  video: number;
  storageBytes: number;
};

export async function getDashboardStats(workId: string | null): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: c, error } = await q;
    if (error) throw error;
    return c ?? 0;
  };
  const byWork = <T extends { eq: (col: "work_id", v: string) => T }>(q: T) => (workId ? q.eq("work_id", workId) : q);

  const [works, chapters, vignettes, drafts, published, archived, images, audio, video, sizes] = await Promise.all([
    count(supabase.from("works").select("id", { count: "exact", head: true })),
    count(byWork(supabase.from("chapters").select("id", { count: "exact", head: true }))),
    count(byWork(supabase.from("vignettes").select("id", { count: "exact", head: true }))),
    count(byWork(supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("status", "draft"))),
    count(byWork(supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("status", "published"))),
    count(byWork(supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("status", "archived"))),
    count(supabase.from("media").select("id", { count: "exact", head: true }).eq("media_type", "image")),
    count(supabase.from("media").select("id", { count: "exact", head: true }).eq("media_type", "audio")),
    count(supabase.from("media").select("id", { count: "exact", head: true }).eq("media_type", "video")),
    supabase.from("media").select("size"),
  ]);

  const storageBytes = (sizes.data ?? []).reduce((acc, m) => acc + Number(m.size ?? 0), 0);
  return { works, chapters, vignettes, drafts, published, archived, images, audio, video, storageBytes };
}

/** Totes les vinyetes de l'obra (qualsevol estat) amb la foto principal: pantalla d'ordenar. */
export async function listVignettesForOrdering(workId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: rows, error }, { data: links, error: linkError }] = await Promise.all([
    supabase
      .from("vignettes")
      .select("id, title, slug, status, chapter_id, piath_text")
      .eq("work_id", workId)
      .order("order_index"),
    // Una sola consulta per a totes les fotos (sense llistes d'ids a la URL).
    supabase
      .from("vignette_media")
      .select(`vignette_id, media(${MEDIA_FIELDS}), vignettes!inner(work_id)`)
      .eq("role", "main_image")
      .eq("vignettes.work_id", workId),
  ]);
  if (error) throw error;
  if (linkError) throw linkError;
  const images = new Map<string, MediaLink["media"]>();
  for (const l of (links ?? []) as unknown as { vignette_id: string; media: MediaLink["media"] | null }[]) {
    if (l.media) images.set(l.vignette_id, l.media);
  }
  return (rows ?? []).map((v) => ({ ...v, main_image: images.get(v.id) ?? null }));
}
