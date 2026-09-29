/**
 * Convencions d'URL públiques (genèriques per a qualsevol obra):
 *
 *   /auca/[work]              → l'obra (inici de lectura)
 *   /auca/[work]/[n]          → vinyeta número n (1..total, calculat per l'ordre)
 *   /auca/[work]/[chapter]    → capítol per slug
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMBER_RE = /^[1-9]\d{0,5}$/;

export type Segment = { kind: "vignette"; number: number } | { kind: "chapter"; slug: string } | { kind: "invalid" };

export function isValidSlug(value: string): boolean {
  return value.length <= 120 && SLUG_RE.test(value);
}

export function parseSegment(raw: string): Segment {
  const value = decodeURIComponent(raw).toLowerCase();
  if (NUMBER_RE.test(value)) return { kind: "vignette", number: Number(value) };
  if (isValidSlug(value)) return { kind: "chapter", slug: value };
  return { kind: "invalid" };
}

/** 7 de 49 → "07"; 7 de 120 → "007". */
export function formatVignetteNumber(n: number, total: number): string {
  return String(n).padStart(Math.max(2, String(total).length), "0");
}

export const routes = {
  home: () => "/",
  auca: () => "/auca",
  work: (work: string) => `/auca/${work}`,
  vignette: (work: string, n: number) => `/auca/${work}/${n}`,
  chapter: (work: string, chapter: string) => `/auca/${work}/${chapter}`,
  chapters: () => "/capitols",
  admin: {
    root: () => "/admin",
    login: () => "/admin/login",
    dashboard: () => "/admin/dashboard",
    work: () => "/admin/work",
    chapters: () => "/admin/chapters",
    vignettes: () => "/admin/vignettes",
    vignette: (id: string) => `/admin/vignettes/${id}`,
    media: () => "/admin/media",
    settings: () => "/admin/settings",
    preview: (work: string, segment?: string | number) =>
      segment === undefined ? `/admin/preview/${work}` : `/admin/preview/${work}/${segment}`,
  },
} as const;
