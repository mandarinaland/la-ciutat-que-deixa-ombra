import type { PostgrestError } from "@supabase/supabase-js";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Tradueix errors de PostgreSQL/PostgREST a missatges comprensibles. */
export function describeDbError(error: PostgrestError | null | undefined, fallback = "No s'ha pogut desar."): string {
  if (!error) return fallback;
  const text = `${error.message} ${error.details ?? ""}`;
  switch (error.code) {
    case "23505":
      if (text.includes("slug")) return "Aquest slug ja existeix. Tria'n un altre.";
      if (text.includes("order")) return "Conflicte d'ordre. Torna-ho a provar.";
      if (text.includes("vignette_media")) return "Aquesta vinyeta ja té un fitxer amb aquest rol.";
      return "Ja existeix un registre amb aquestes dades.";
    case "23503":
      if (text.includes("vignette_media_media_id_fkey")) return "Aquest fitxer s'està fent servir en alguna vinyeta.";
      if (text.includes("vignettes_chapter_same_work")) return "El capítol no pertany a aquesta obra.";
      return "Hi ha una referència que no és vàlida.";
    case "23514":
      if (text.includes("slug")) return "Slug no vàlid: minúscules, números i guions (un capítol no pot ser només números).";
      return error.message;
    case "42501":
      return "No tens permís per fer aquesta acció.";
    case "PGRST116":
      return "No s'ha trobat el registre.";
    default:
      return error.message || fallback;
  }
}
