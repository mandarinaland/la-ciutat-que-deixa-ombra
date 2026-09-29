"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { describeDbError, type ActionResult } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  formToObject,
  moveInList,
  optionalText,
  slugField,
  touchContent,
  uuid,
} from "./_shared";

/** Crea una vinyeta en esborrany al final de l'obra i obre l'editor. */
export async function createVignetteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const workId = uuid.parse(formData.get("work_id"));
  const chapterRaw = formData.get("chapter_id");
  const chapterId = typeof chapterRaw === "string" && chapterRaw ? uuid.parse(chapterRaw) : null;

  const supabase = await createSupabaseServerClient();
  const { data: work } = await supabase.from("works").select("credit_photography").eq("id", workId).maybeSingle();
  if (!work) throw new Error("Obra no trobada");

  const { count } = await supabase.from("vignettes").select("id", { count: "exact", head: true }).eq("work_id", workId);

  // Slug provisional únic; es pot canviar a l'editor.
  let n = (count ?? 0) + 1;
  for (let attempt = 0; attempt < 20; attempt++, n++) {
    const { data, error } = await supabase
      .from("vignettes")
      .insert({
        work_id: workId,
        chapter_id: chapterId,
        slug: `vinyeta-${n}`,
        status: "draft",
        photographer: work.credit_photography,
      })
      .select("id")
      .single();
    if (!error) {
      touchContent();
      redirect(`/admin/vignettes/${data.id}`);
    }
    if (error.code !== "23505") throw new Error(describeDbError(error));
  }
  throw new Error("No s'ha pogut generar un slug únic");
}

const saveSchema = z.object({
  id: uuid,
  intent: z.enum(["save", "publish", "unpublish", "archive", "unarchive"]).default("save"),
  title: optionalText(300),
  slug: slugField,
  piath_text: optionalText(20000),
  caption: optionalText(2000),
  photographer: optionalText(300),
  photo_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data no vàlida"),
  location: optionalText(300),
  chapter_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(uuid.nullable()),
});

export async function saveVignetteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = saveSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Revisa el formulari", fieldErrors: fieldErrors(parsed.error) };

  const { id, intent, ...values } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase.from("vignettes").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "No s'ha trobat la vinyeta" };

  // L'estat NO ve del formulari: només canvia amb els botons explícits.
  const status =
    intent === "publish"
      ? "published"
      : intent === "unpublish" || intent === "unarchive"
        ? "draft"
        : intent === "archive"
          ? "archived"
          : current.status;

  // Requisits per publicar: fotografia principal amb text alternatiu (accessibilitat).
  if (status === "published") {
    const { data: main } = await supabase
      .from("vignette_media")
      .select("media(alt_text)")
      .eq("vignette_id", id)
      .eq("role", "main_image")
      .maybeSingle();
    if (!main?.media) return { ok: false, error: "Per publicar cal una fotografia principal." };
    if (!main.media.alt_text?.trim())
      return { ok: false, error: "Per publicar, la fotografia ha de tenir text alternatiu (descripció per a lectors de pantalla)." };
  }

  const { error } = await supabase.from("vignettes").update({ ...values, status }).eq("id", id);
  if (error) {
    const message = describeDbError(error);
    return { ok: false, error: message, fieldErrors: message.includes("slug") ? { slug: message } : undefined };
  }

  if (status !== current.status) console.info(`[vinyeta] ${id}: ${current.status} → ${status} (${intent})`);

  // Si canvia la visibilitat, els enllaços signats cachejats s'han de renovar.
  touchContent({ media: status !== current.status });

  const messages = {
    publish: "Publicada.",
    unpublish: "Retirada: ara és un esborrany.",
    archive: "Arxivada.",
    unarchive: "Desarxivada: ara és un esborrany.",
    save: "Desat.",
  } as const;
  return { ok: true, message: messages[intent] };
}

export async function deleteVignetteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Vinyeta no vàlida" };

  const supabase = await createSupabaseServerClient();
  // Els vincles amb fitxers s'esborren en cascada; els fitxers queden a la mediateca.
  const { error } = await supabase.from("vignettes").delete().eq("id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };

  touchContent({ media: true });
  redirect("/admin/vignettes");
}

export async function moveVignetteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!id.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: vignette } = await supabase.from("vignettes").select("work_id").eq("id", id.data).maybeSingle();
  if (!vignette) return;
  const { data: all } = await supabase.from("vignettes").select("id").eq("work_id", vignette.work_id).order("order_index");
  const next = moveInList((all ?? []).map((v) => v.id), id.data, direction);
  if (!next) return;

  const { error } = await supabase.rpc("reorder_vignettes", { p_work_id: vignette.work_id, p_ids: next });
  if (error) throw new Error(describeDbError(error));
  touchContent();
}

/** Ordre complet (per a l'arrossegar-i-deixar de la Fase 10). */
export async function reorderVignettesAction(workId: string, ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ workId: uuid, ids: z.array(uuid).max(10000) }).safeParse({ workId, ids });
  if (!parsed.success) return { ok: false, error: "Dades no vàlides" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_vignettes", { p_work_id: parsed.data.workId, p_ids: parsed.data.ids });
  if (error) return { ok: false, error: describeDbError(error) };
  touchContent();
  return { ok: true };
}
