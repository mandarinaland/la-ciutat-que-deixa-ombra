import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Views } from "@/types/database";

export type LibraryItem = Views<"media_with_usage"> & {
  usedIn: { vignetteId: string; title: string | null; slug: string; role: Enums<"media_role"> }[];
};

export type LibraryPage = { items: LibraryItem[]; total: number; page: number; pages: number };

/** Mediateca paginada, amb cerca per nom o text alternatiu i on s'utilitza cada fitxer. */
export async function listMedia({
  type,
  q,
  page = 1,
  pageSize = 48,
}: {
  type?: Enums<"media_type">;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<LibraryPage> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("media_with_usage").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (type) query = query.eq("media_type", type);
  const term = q?.trim().replace(/[%_,()]/g, " ").slice(0, 100);
  if (term) query = query.or(`filename.ilike.%${term}%,alt_text.ilike.%${term}%,original_filename.ilike.%${term}%`);

  const from = (Math.max(1, page) - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw error;

  const rows = data ?? [];
  const usage = new Map<string, LibraryItem["usedIn"]>();
  if (rows.length) {
    const { data: links, error: linkError } = await supabase
      .from("vignette_media")
      .select("media_id, role, vignettes(id, title, slug)")
      .in("media_id", rows.map((r) => r.id));
    if (linkError) throw linkError;
    for (const l of links ?? []) {
      if (!l.vignettes) continue;
      const list = usage.get(l.media_id) ?? [];
      list.push({ vignetteId: l.vignettes.id, title: l.vignettes.title, slug: l.vignettes.slug, role: l.role });
      usage.set(l.media_id, list);
    }
  }

  const total = count ?? rows.length;
  return {
    items: rows.map((r) => ({ ...r, usedIn: usage.get(r.id) ?? [] })),
    total,
    page: Math.max(1, page),
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
