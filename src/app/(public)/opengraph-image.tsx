import { coverCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { loadLanding } from "@/lib/data/auca";
import { DEFAULT_WORK_SLUG, isSupabaseConfigured } from "@/lib/env";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Es genera a la primera visita (no durant el build) i la CDN la guarda un dia.
export const dynamic = "force-dynamic";

export default async function Image() {
  const landing = isSupabaseConfigured() ? await loadLanding("public", DEFAULT_WORK_SLUG) : null;
  return coverCard({
    title: landing?.work.title ?? siteConfig.name,
    subtitle: landing?.work.subtitle ?? siteConfig.tagline,
    photos: [landing?.cover?.src, landing?.sections[0]?.items[0]?.image?.src],
  });
}
