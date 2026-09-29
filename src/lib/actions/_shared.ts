import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { CONTENT_TAG } from "@/lib/data/public";
import { MEDIA_URLS_TAG } from "@/lib/media/sources";

/**
 * Invalida la cache pública després d'un canvi.
 * `updateTag` (Next 16) expira immediatament: la propera visita ja veu el canvi.
 */
export function touchContent({ media = false }: { media?: boolean } = {}) {
  updateTag(CONTENT_TAG);
  // Els enllaços signats d'un fitxer que acaba de publicar-se o despublicar-se han de renovar-se.
  if (media) updateTag(MEDIA_URLS_TAG);
  // Pàgines públiques ja generades (ISR): la següent visita es torna a renderitzar.
  revalidatePath("/", "layout");
}

/** Text opcional: "" → null, retalla espais, limita la llargada. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Màxim ${max} caràcters`)
    .optional()
    .transform((v) => (v ? v : null));

export const requiredText = (max: number, message = "Camp obligatori") =>
  z.string().trim().min(1, message).max(max, `Màxim ${max} caràcters`);

export const uuid = z.uuid({ message: "Identificador no vàlid" });

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Màxim 120 caràcters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Només minúscules, números i guions");

export const statusField = z.enum(["draft", "published", "archived"]);

/** Converteix FormData en objecte pla (només camps de text). */
export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value;
  return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}

/** Calcula el nou ordre d'ids en moure un element una posició amunt o avall. */
export function moveInList(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
