import { coverCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { loadLanding } from "@/lib/data/auca";
import { DEFAULT_WORK_SLUG, isSupabaseConfigured } from "@/lib/env";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

export default async function Image() {
  const landing = isSupabaseConfigured() ? await loadLanding("public", DEFAULT_WORK_SLUG) : null;
  return coverCard({
    title: landing?.work.title ?? siteConfig.name,
    subtitle: landing?.work.subtitle ?? siteConfig.tagline,
    photo: landing?.cover?.src,
  });
}
