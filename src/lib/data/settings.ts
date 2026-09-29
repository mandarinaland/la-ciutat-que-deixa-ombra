import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BUCKET_MAX_BYTES, DEFAULT_LIMITS, type MediaKind, type UploadLimits } from "@/lib/media/limits";

type StoredLimits = Partial<Record<MediaKind, { max_bytes?: number }>>;

/**
 * Límits de pujada configurables (site_settings.upload_limits), sempre retallats
 * al límit dur del bucket. Llegits amb la sessió de l'admin.
 */
export async function getUploadLimits(): Promise<UploadLimits> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "upload_limits").maybeSingle();
  const stored = (data?.value ?? {}) as StoredLimits;
  const out = { ...DEFAULT_LIMITS };
  for (const kind of ["image", "audio", "video"] as const) {
    const v = Number(stored[kind]?.max_bytes);
    if (Number.isFinite(v) && v > 0) out[kind] = { maxBytes: Math.min(v, BUCKET_MAX_BYTES[kind]) };
  }
  return out;
}
