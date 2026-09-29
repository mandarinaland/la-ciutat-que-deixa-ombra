"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { describeDbError, type ActionResult } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  fieldErrors,
  formToObject,
  moveInList,
  optionalText,
  requiredText,
  slugField,
  statusField,
  touchContent,
  uuid,
} from "./_shared";

const chapterSlug = slugField.refine((s) => !/^\d+$/.test(s), "Un capítol no pot ser només números");

const createSchema = z.object({
  work_id: uuid,
  title: requiredText(300, "Cal un títol"),
  slug: z.string().trim().optional(),
});

export async function createChapterAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Revisa el formulari", fieldErrors: fieldErrors(parsed.error) };

  const slug = chapterSlug.safeParse(parsed.data.slug || slugify(parsed.data.title));
  if (!slug.success) return { ok: false, error: "Slug no vàlid", fieldErrors: { slug: slug.error.issues[0]!.message } };

  const supabase = await createSupabaseServerClient();
  // order_index l'assigna el trigger (al final)
  const { error } = await supabase
    .from("chapters")
    .insert({ work_id: parsed.data.work_id, title: parsed.data.title, slug: slug.data, status: "draft" });
  if (error) return { ok: false, error: describeDbError(error) };

  touchContent();
  return { ok: true, message: "Capítol creat." };
}

const updateSchema = z.object({
  id: uuid,
  title: requiredText(300, "Cal un títol"),
  slug: chapterSlug,
  description: optionalText(5000),
  status: statusField,
});

export async function updateChapterAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Revisa el formulari", fieldErrors: fieldErrors(parsed.error) };

  const { id, ...values } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chapters").update(values).eq("id", id);
  if (error) return { ok: false, error: describeDbError(error) };

  touchContent();
  return { ok: true, message: "Desat." };
}

/** Les vinyetes del capítol no s'esborren: queden sense capítol. */
export async function deleteChapterAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Capítol no vàlid" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chapters").delete().eq("id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };

  touchContent();
  return { ok: true };
}

export async function moveChapterAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!id.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: chapter } = await supabase.from("chapters").select("work_id").eq("id", id.data).maybeSingle();
  if (!chapter) return;
  const { data: all } = await supabase.from("chapters").select("id").eq("work_id", chapter.work_id).order("order_index");
  const next = moveInList((all ?? []).map((c) => c.id), id.data, direction);
  if (!next) return;

  const { error } = await supabase.rpc("reorder_chapters", { p_work_id: chapter.work_id, p_ids: next });
  if (error) throw new Error(describeDbError(error));
  touchContent();
}

export async function reorderChaptersAction(workId: string, ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ workId: uuid, ids: z.array(uuid).max(1000) }).safeParse({ workId, ids });
  if (!parsed.success) return { ok: false, error: "Dades no vàlides" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_chapters", { p_work_id: parsed.data.workId, p_ids: parsed.data.ids });
  if (error) return { ok: false, error: describeDbError(error) };
  touchContent();
  return { ok: true };
}
