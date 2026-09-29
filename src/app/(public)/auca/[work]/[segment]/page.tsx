import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterPageView, ReaderView } from "@/components/auca/views";
import { hrefsFor, loadChapter, loadVignette } from "@/lib/data/auca";
import { vignetteMetadata } from "@/lib/data/auca-meta";
import { isValidSlug, parseSegment, routes } from "@/lib/routing";

export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ work: string; segment: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work, segment } = await params;
  if (!isValidSlug(work)) return {};
  const parsed = parseSegment(segment);
  if (parsed.kind === "vignette") {
    const v = await loadVignette("public", work, parsed.number);
    return v ? vignetteMetadata(v, routes.vignette(work, parsed.number)) : {};
  }
  if (parsed.kind === "chapter") {
    const c = await loadChapter("public", work, parsed.slug);
    return c
      ? { title: c.chapter.title, description: c.chapter.description ?? undefined, alternates: { canonical: routes.chapter(work, parsed.slug) } }
      : {};
  }
  return {};
}

/**
 * Un sol segment resol dues coses:
 *   /auca/[work]/23   → vinyeta 23
 *   /auca/[work]/vic  → capítol "vic"
 */
export default async function SegmentPage({ params }: Props) {
  const { work, segment } = await params;
  if (!isValidSlug(work)) notFound();
  const parsed = parseSegment(segment);
  const hrefs = hrefsFor("public", work);

  if (parsed.kind === "vignette") {
    const v = await loadVignette("public", work, parsed.number);
    if (!v) notFound();
    return <ReaderView v={v} hrefs={hrefs} />;
  }
  if (parsed.kind === "chapter") {
    const c = await loadChapter("public", work, parsed.slug);
    if (!c) notFound();
    return <ChapterPageView view={c} hrefs={hrefs} />;
  }
  notFound();
}
