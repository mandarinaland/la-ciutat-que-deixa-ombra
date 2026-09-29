import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { DEFAULT_WORK_SLUG } from "@/lib/env";

/**
 * FASE 1: rutes estructurals.
 * FASE 14: s'hi afegiran obres, capítols i vinyetes publicades des de Supabase.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl(`/auca/${DEFAULT_WORK_SLUG}`), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/capitols"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
