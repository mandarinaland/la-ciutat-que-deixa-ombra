"use server";

import { z } from "zod";
import { requireAdmin, requireOwner } from "@/lib/auth/admin";
import { describeDbError, type ActionResult } from "@/lib/data/errors";
import { BUCKET_MAX_BYTES } from "@/lib/media/limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { formToObject, touchContent } from "./_shared";

const MB = 1024 * 1024;
const mbField = (cap: number) =>
  z.coerce
    .number({ message: "Ha de ser un número" })
    .positive("Ha de ser més gran que 0")
    .max(cap / MB, `Màxim ${cap / MB} MB (límit del bucket)`);

const limitsSchema = z.object({
  image: mbField(BUCKET_MAX_BYTES.image),
  audio: mbField(BUCKET_MAX_BYTES.audio),
  video: mbField(BUCKET_MAX_BYTES.video),
});

export async function saveUploadLimitsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = limitsSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Revisa els límits", fieldErrors: fe };
  }
  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("site_settings").select("value").eq("key", "upload_limits").maybeSingle();
  const value = { ...((current?.value as Record<string, unknown>) ?? {}) } as Record<string, Record<string, unknown>>;
  for (const kind of ["image", "audio", "video"] as const) {
    value[kind] = { ...(value[kind] ?? {}), max_bytes: Math.round(parsed.data[kind] * MB) };
  }
  const { error } = await supabase.from("site_settings").upsert({ key: "upload_limits", value: value as unknown as Json, is_public: false });
  if (error) return { ok: false, error: describeDbError(error) };
  touchContent();
  return { ok: true, message: "Límits desats." };
}

/**
 * Administradors. Els comptes es creen a Supabase Auth (els registres públics estan tancats);
 * aquí només es dona o es treu permís. Buscar un usuari per correu requereix la service role.
 */
export async function addAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireOwner();
  const parsed = z
    .object({ email: z.email("Correu no vàlid"), role: z.enum(["owner", "editor"]) })
    .safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };

  const { createSupabaseServiceClient } = await import("@/lib/supabase/admin");
  const service = createSupabaseServiceClient();
  const email = parsed.data.email.toLowerCase();
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { ok: false, error: "No s'han pogut consultar els usuaris." };
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    return { ok: false, error: "No hi ha cap compte amb aquest correu. Crea'l primer a Supabase → Authentication → Users." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admins").upsert({ user_id: userId, role: parsed.data.role });
  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, message: `${email} ara és ${parsed.data.role === "owner" ? "owner" : "editor"}.` };
}

export async function removeAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireOwner();
  const id = z.uuid().safeParse(formData.get("user_id"));
  if (!id.success) return { ok: false, error: "Usuari no vàlid" };
  if (id.data === me.userId) return { ok: false, error: "No et pots treure a tu mateix." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admins").delete().eq("user_id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, message: "Permís retirat." };
}
