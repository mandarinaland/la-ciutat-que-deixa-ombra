import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterPageView, LandingView, ReaderView } from "@/components/auca/views";
import { QuietPage } from "@/components/public/QuietPage";
import { hrefsFor, loadChapter, loadLanding, loadVignette } from "@/lib/data/auca";
import { isValidSlug, parseSegment } from "@/lib/routing";

export const metadata: Metadata = { title: "Previsualització" };

type Props = { params: Promise<{ work: string; segment?: string[] }> };

/** Mateixos components que la web pública, llegint amb la sessió d'administrador. */
export default async function PreviewPage({ params }: Props) {
  const { work, segment } = await params;
  if (!isValidSlug(work) || (segment && segment.length > 1)) notFound();
  const hrefs = hrefsFor("preview", work);

  if (!segment?.[0]) {
    const landing = await loadLanding("preview", work);
    if (!landing) notFound();
    return <LandingView landing={landing} hrefs={hrefs} />;
  }

  const parsed = parseSegment(segment[0]);
  if (parsed.kind === "vignette") {
    const v = await loadVignette("preview", work, parsed.number);
    if (!v) {
      return (
        <QuietPage eyebrow={`Vinyeta ${parsed.number}`} title="No existeix">
          Aquesta vinyeta no existeix (o està arxivada).
        </QuietPage>
      );
    }
    return <ReaderView v={v} hrefs={hrefs} />;
  }
  if (parsed.kind === "chapter") {
    const c = await loadChapter("preview", work, parsed.slug);
    if (!c) notFound();
    return <ChapterPageView view={c} hrefs={hrefs} />;
  }
  notFound();
}
