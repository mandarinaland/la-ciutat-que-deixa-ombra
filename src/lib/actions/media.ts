"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { describeDbError, type ActionResult } from "@/lib/data/errors";
import { getUploadLimits } from "@/lib/data/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMediaSources } from "@/lib/media/sources";
import {
  ALLOWED,
  BUCKET_FOR,
  checkFile,
  cleanFilename,
  extensionOf,
  type MediaKind,
} from "@/lib/media/limits";
import { MEDIA_FIELDS, type MediaItem } from "@/lib/data/types";
import type { Enums } from "@/types/database";
import { touchContent, uuid } from "./_shared";

/* ────────────────────────────────────────────────────────────────────
 * Pujada en tres passos:
 *   1. createUploadAction  → valida i retorna una URL de pujada signada
 *   2. el navegador puja directament a Supabase (XHR: progrés + cancel·lar)
 *   3. finalizeUploadAction → comprova el fitxer real, crea la fila `media`
 *      i, si cal, el vincula a una vinyeta o a la portada d'una obra
 * ──────────────────────────────────────────────────────────────────── */

const SINGLE_ROLES = new Set<Enums<"media_role">>(["main_image", "audio_piath", "video", "video_poster"]);
const roleSchema = z.enum([
  "main_image",
  "alternative_image",
  "audio_piath",
  "ambient_audio",
  "music",
  "video",
  "video_poster",
]);


const targetSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("vignette"), vignetteId: uuid, role: roleSchema }),
    z.object({ type: z.literal("cover"), workId: uuid }),
    z.object({ type: z.literal("poem"), workId: uuid }),
  ])
  .optional();

export type AttachTarget = z.infer<typeof targetSchema>;

export type UploadTicket = {
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  mime: string;
  kind: MediaKind;
};

const createSchema = z.object({
  filename: z.string().min(1).max(255),
  type: z.string().max(100),
  size: z.number().int().positive(),
  expected: z.enum(["image", "audio", "video"]).optional(),
});

export async function createUploadAction(input: z.infer<typeof createSchema>): Promise<ActionResult<UploadTicket>> {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dades del fitxer no vàlides." };

  const limits = await getUploadLimits();
  const check = checkFile({ name: parsed.data.filename, type: parsed.data.type, size: parsed.data.size }, limits, parsed.data.expected);
  if (!check.ok) return { ok: false, error: check.error };

  const now = new Date();
  const ext = extensionOf(parsed.data.filename);
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
  const bucket = BUCKET_FOR[check.kind];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: `No s'ha pogut preparar la pujada: ${error?.message ?? "error desconegut"}` };

  return { ok: true, data: { bucket, path, signedUrl: data.signedUrl, token: data.token, mime: check.mime, kind: check.kind } };
}

const finalizeSchema = z.object({
  bucket: z.enum(["images", "audio", "video"]),
  path: z.string().regex(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{1,6}$/),
  originalFilename: z.string().min(1).max(255),
  mime: z.string().max(100),
  width: z.number().int().positive().max(100000).nullable().optional(),
  height: z.number().int().positive().max(100000).nullable().optional(),
  duration: z.number().nonnegative().max(60 * 60 * 24).nullable().optional(),
  altText: z.string().trim().max(1000).optional(),
  target: targetSchema,
});

export async function finalizeUploadAction(input: z.infer<typeof finalizeSchema>): Promise<ActionResult<{ mediaId: string }>> {
  const admin = await requireAdmin();
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dades de la pujada no vàlides." };
  const d = parsed.data;

  const supabase = await createSupabaseServerClient();
  const storage = supabase.storage.from(d.bucket);

  // El fitxer real manda: mida i tipus que ha rebut Storage, no els que diu el navegador.
  const { data: info, error: infoError } = await storage.info(d.path);
  if (infoError || !info) return { ok: false, error: "El fitxer no ha arribat a Storage. Torna-ho a provar." };

  const realSize = Number(info.size ?? 0);
  const realMime = String(info.contentType ?? d.mime).split(";")[0]!.trim().toLowerCase();
  const kind = (Object.keys(BUCKET_FOR) as MediaKind[]).find((k) => BUCKET_FOR[k] === d.bucket)!;
  const limits = await getUploadLimits();
  const mime = ALLOWED[kind].mimes.includes(realMime) ? realMime : d.mime;

  if (!ALLOWED[kind].mimes.includes(mime) || realSize <= 0 || realSize > limits[kind].maxBytes) {
    await storage.remove([d.path]);
    return { ok: false, error: "El fitxer no compleix els límits i s'ha descartat." };
  }

  const { data: media, error } = await supabase
    .from("media")
    .insert({
      filename: cleanFilename(d.originalFilename),
      original_filename: d.originalFilename.slice(0, 255),
      bucket: d.bucket,
      storage_path: d.path,
      provider: "supabase",
      media_type: kind,
      mime_type: mime,
      size: realSize,
      width: kind === "audio" ? null : (d.width ?? null),
      height: kind === "audio" ? null : (d.height ?? null),
      duration: kind === "image" ? null : (d.duration ?? null),
      alt_text: d.altText ? d.altText : null,
      created_by: admin.userId,
    })
    .select("id")
    .single();
  if (error || !media) {
    await storage.remove([d.path]);
    return { ok: false, error: describeDbError(error, "No s'ha pogut registrar el fitxer.") };
  }

  if (d.target) {
    const attached = await attach(media.id, d.target);
    if (!attached.ok) return attached;
  }

  touchContent({ media: true });
  return { ok: true, data: { mediaId: media.id } };
}

async function attach(mediaId: string, target: NonNullable<AttachTarget>): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  if (target.type === "cover") {
    const { data: m } = await supabase.from("media").select("media_type").eq("id", mediaId).maybeSingle();
    if (m?.media_type !== "image") return { ok: false, error: "La portada ha de ser una imatge." };
    const { error } = await supabase.from("works").update({ cover_media_id: mediaId }).eq("id", target.workId);
    return error ? { ok: false, error: describeDbError(error) } : { ok: true };
  }

  if (target.type === "poem") {
    const { data: m } = await supabase.from("media").select("media_type").eq("id", mediaId).maybeSingle();
    if (m?.media_type !== "audio") return { ok: false, error: "El poema ha de ser un fitxer d'àudio." };
    const { error } = await supabase.from("works").update({ intro_audio_media_id: mediaId }).eq("id", target.workId);
    return error ? { ok: false, error: describeDbError(error) } : { ok: true };
  }

  // Rols únics: el nou fitxer substitueix l'anterior (que continua a la mediateca).
  if (SINGLE_ROLES.has(target.role)) {
    const { error: delError } = await supabase
      .from("vignette_media")
      .delete()
      .eq("vignette_id", target.vignetteId)
      .eq("role", target.role);
    if (delError) return { ok: false, error: describeDbError(delError) };
  }

  let position = 0;
  if (!SINGLE_ROLES.has(target.role)) {
    const { data: last } = await supabase
      .from("vignette_media")
      .select("position")
      .eq("vignette_id", target.vignetteId)
      .eq("role", target.role)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = (last?.position ?? -1) + 1;
  }

  const { error } = await supabase
    .from("vignette_media")
    .insert({ vignette_id: target.vignetteId, media_id: mediaId, role: target.role, position });
  return error ? { ok: false, error: describeDbError(error) } : { ok: true };
}

/** Vincular un fitxer que ja és a la mediateca (reutilitzar). */
export async function attachMediaAction(mediaId: string, target: NonNullable<AttachTarget>): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(mediaId);
  const t = targetSchema.safeParse(target);
  if (!id.success || !t.success || !t.data) return { ok: false, error: "Dades no vàlides." };
  const res = await attach(id.data, t.data);
  if (res.ok) touchContent({ media: true });
  return res;
}

/** Treure un fitxer d'una vinyeta o de la portada. El fitxer es queda a la mediateca. */
export async function detachMediaAction(target: NonNullable<AttachTarget>, mediaId?: string): Promise<ActionResult> {
  await requireAdmin();
  const t = targetSchema.safeParse(target);
  if (!t.success || !t.data) return { ok: false, error: "Dades no vàlides." };
  const supabase = await createSupabaseServerClient();

  if (t.data.type === "cover" || t.data.type === "poem") {
    const patch = t.data.type === "cover" ? { cover_media_id: null } : { intro_audio_media_id: null };
    const { error } = await supabase.from("works").update(patch).eq("id", t.data.workId);
    if (error) return { ok: false, error: describeDbError(error) };
  } else {
    let q = supabase.from("vignette_media").delete().eq("vignette_id", t.data.vignetteId).eq("role", t.data.role);
    if (mediaId && uuid.safeParse(mediaId).success) q = q.eq("media_id", mediaId);
    const { error } = await q;
    if (error) return { ok: false, error: describeDbError(error) };

    // Una vinyeta publicada sense fotografia no té sentit: torna a esborrany.
    if (t.data.role === "main_image") {
      await supabase.from("vignettes").update({ status: "draft" }).eq("id", t.data.vignetteId).eq("status", "published");
    }
  }
  touchContent({ media: true });
  return { ok: true };
}

export async function updateAltTextAction(mediaId: string, altText: string): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(mediaId);
  const alt = z.string().trim().max(1000).safeParse(altText);
  if (!id.success || !alt.success) return { ok: false, error: "Dades no vàlides." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("media").update({ alt_text: alt.data || null }).eq("id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };
  touchContent();
  return { ok: true, message: "Text alternatiu desat." };
}

/** Elimina un fitxer de la mediateca i de Storage. Només si ningú no l'utilitza. */
export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  await requireAdmin();
  const id = uuid.safeParse(mediaId);
  if (!id.success) return { ok: false, error: "Fitxer no vàlid." };
  const supabase = await createSupabaseServerClient();

  const { data: m } = await supabase
    .from("media_with_usage")
    .select("bucket, storage_path, usage_count, cover_count")
    .eq("id", id.data)
    .maybeSingle();
  if (!m) return { ok: false, error: "No s'ha trobat el fitxer." };
  if ((m.usage_count ?? 0) > 0 || (m.cover_count ?? 0) > 0) {
    return { ok: false, error: "Aquest fitxer s'està fent servir. Treu-lo primer de les vinyetes o de la portada." };
  }

  const { error } = await supabase.from("media").delete().eq("id", id.data);
  if (error) return { ok: false, error: describeDbError(error) };

  if (m.bucket && m.storage_path) {
    const { error: rmError } = await supabase.storage.from(m.bucket).remove([m.storage_path]);
    if (rmError) console.error(`[media] Objecte orfe a Storage: ${m.bucket}/${m.storage_path}`, rmError);
  }
  touchContent({ media: true });
  return { ok: true, message: "Fitxer eliminat." };
}

export type PickerItem = MediaItem & { filename: string; url: string | null; stable: boolean };

/** Cerca per al selector "Triar de la mediateca". */
export async function searchMediaAction(input: {
  type: MediaKind;
  q?: string;
  page?: number;
}): Promise<ActionResult<{ items: PickerItem[]; hasMore: boolean }>> {
  await requireAdmin();
  const parsed = z
    .object({ type: z.enum(["image", "audio", "video"]), q: z.string().max(100).optional(), page: z.number().int().min(1).max(500).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Cerca no vàlida." };

  const pageSize = 24;
  const page = parsed.data.page ?? 1;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("media")
    .select(`${MEDIA_FIELDS}, filename, created_at`)
    .eq("media_type", parsed.data.type)
    .order("created_at", { ascending: false });
  const term = parsed.data.q?.trim().replace(/[%_,()]/g, " ");
  if (term) query = query.or(`filename.ilike.%${term}%,alt_text.ilike.%${term}%`);
  const { data, error } = await query.range((page - 1) * pageSize, page * pageSize);
  if (error) return { ok: false, error: describeDbError(error) };

  const rows = (data ?? []).slice(0, pageSize);
  const sources = await resolveMediaSources(rows, "admin");
  return {
    ok: true,
    data: {
      hasMore: (data?.length ?? 0) > pageSize,
      items: rows.map((r) => {
        const s = sources.get(r.id);
        return { ...r, url: s?.url ?? null, stable: s?.kind === "file" ? s.stable !== false : true };
      }),
    },
  };
}
