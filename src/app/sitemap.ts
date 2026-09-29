import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { DEFAULT_WORK_SLUG, isSupabaseConfigured } from "@/lib/env";
import { listChaptersFor, loadLanding } from "@/lib/data/auca";
import { routes } from "@/lib/routing";

export const revalidate = 3600;

/** Portada, capítols i totes les vinyetes publicades de l'obra per defecte. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [{ url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 }];
  if (!isSupabaseConfigured()) return base;

  const [landing, chapters] = await Promise.all([
    loadLanding("public", DEFAULT_WORK_SLUG),
    listChaptersFor("public", DEFAULT_WORK_SLUG),
  ]);
  if (!landing) return base;

  base[0]!.lastModified = new Date(landing.work.updated_at);
  return [
    ...base,
    ...(chapters?.chapters ?? []).map((c) => ({
      url: absoluteUrl(routes.chapter(DEFAULT_WORK_SLUG, c.chapter.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...landing.sections.flatMap((s) =>
      s.items.map((it) => ({
        url: absoluteUrl(routes.vignette(DEFAULT_WORK_SLUG, it.number)),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ),
  ];
}
