import { coverCard, OG_CONTENT_TYPE, OG_SIZE, vignetteCard } from "@/lib/og";
import { loadChapter, loadVignette } from "@/lib/data/auca";
import { formatVignetteNumber, isValidSlug, parseSegment } from "@/lib/routing";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

/** Targeta per compartir una vinyeta (o un capítol). */
export default async function Image({ params }: { params: Promise<{ work: string; segment: string }> }) {
  const { work, segment } = await params;
  const parsed = isValidSlug(work) ? parseSegment(segment) : ({ kind: "invalid" } as const);

  if (parsed.kind === "vignette") {
    const v = await loadVignette("public", work, parsed.number);
    if (v) {
      return vignetteCard({
        work: v.work.title,
        number: formatVignetteNumber(v.number, v.total),
        title: v.title,
        text: v.text?.trim().split(/\n+/)[0],
        chapter: v.chapter ? `${v.chapter.numeral} · ${v.chapter.title}` : null,
        photo: v.image?.src,
      });
    }
  }
  if (parsed.kind === "chapter") {
    const c = await loadChapter("public", work, parsed.slug);
    if (c) return coverCard({ eyebrow: `Capítol ${c.chapter.numeral}`, title: c.chapter.title, subtitle: c.work.title, photo: c.items[0]?.image?.src });
  }
  return coverCard({ title: siteConfig.name, subtitle: siteConfig.tagline });
}
