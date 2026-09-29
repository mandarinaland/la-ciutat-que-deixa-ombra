import { coverCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { loadLanding } from "@/lib/data/auca";
import { isValidSlug } from "@/lib/routing";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ work: string }> }) {
  const { work } = await params;
  const landing = isValidSlug(work) ? await loadLanding("public", work) : null;
  return coverCard({ title: landing?.work.title ?? siteConfig.name, subtitle: landing?.work.subtitle, photos: [landing?.cover?.src, landing?.sections[0]?.items[0]?.image?.src] });
}
