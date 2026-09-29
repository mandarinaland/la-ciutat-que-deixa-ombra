"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireOwner } from "@/lib/auth/admin";
import { CURRENT_WORK_COOKIE } from "@/lib/data/admin";
import { describeDbError, type ActionResult } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  fieldErrors,
  formToObject,
  optionalText,
  requiredText,
  slugField,
  statusField,
  touchContent,
  uuid,
} from "./_shared";

async function setCurrentWork(id: string) {
  const store = await cookies();
  store.set(CURRENT_WORK_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function selectWorkAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (id.success) await setCurrentWork(id.data);
  redirect("/admin/work");
}

const createSchema = z.object({
  title: requiredText(300, "Cal un títol"),
  slug: z.string().trim().optional(),
});

export async function createWorkAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Revisa el formulari", fieldErrors: fieldErrors(parsed.error) };

  const slug = slugField.safeParse(parsed.data.slug || slugify(parsed.data.title));
  if (!slug.success) return { ok: false, error: "Slug no vàlid", fieldErrors: { slug: slug.error.issues[0]!.message } };

  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase.from("works").select("order_index").order("order_index", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("works")
    .insert({ title: parsed.data.title, slug: slug.data, status: "draft", order_index: (last?.order_index ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: describeDbError(error) };

  await setCurrentWork(data.id);
  touchContent();
  redirect("/admin/work");
}

const updateSchema = z.object({
  id: uuid,
  title: requiredText(300, "Cal un títol"),
  slug: slugField,
  subtitle: optionalText(300),
  intro_text: optionalText(1000),
  description: optionalText(10000),
  credit_photography: optionalText(300),
  credit_text_voice: optionalText(300),
  status: statusField,
});

export async function updateWorkAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Revisa el formulari", fieldErrors: fieldErrors(parsed.error) };

  const { id, ...values } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("works").update(values).eq("id", id);
  if (error) return { ok: false, error: describeDbError(error) };

  touchContent({ media: true });
  return { ok: true, message: "Obra desada." };
}

/** Eliminar una obra esborra capítols i vinyetes (no els fitxers de la mediateca). Només owner. */
export async function deleteWorkAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const id = uuid.safeParse(formData.get("id"));
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!id.success) return { ok: false, error: "Obra no vàlida" };

  const supabase = await createSupabaseServerClient();
  const { data: work } = await supabase.from("works").select("slug").eq("id", id.data).maybeSingle();
  if (!work) return { ok: false, error: "No s'ha trobat l'obra" };
  if (confirm !== work.slug) return { ok: false, error: `Escriu «${work.slug}» per confirmar.` };

  const { error } = await supabase.from("works").delete().eq("id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };

  (await cookies()).delete({ name: CURRENT_WORK_COOKIE, path: "/admin" });
  touchContent({ media: true });
  redirect("/admin/work");
}
