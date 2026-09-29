/**
 * "Allò que no diem" → "allo-que-no-diem" · "Col·lecció" → "colleccio"
 */
export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[·ŀĿ]/g, "") // punt volat català
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
