import { notFound } from "next/navigation";
import { QuietPage } from "@/components/public/QuietPage";
import { isValidSlug, parseSegment } from "@/lib/routing";

type Props = { params: Promise<{ work: string; segment: string }> };

/**
 * Un sol segment resol dues coses:
 *   /auca/[work]/23   → vinyeta 23   (FASE 12)
 *   /auca/[work]/vic  → capítol "vic" (FASE 11)
 */
export default async function SegmentPage({ params }: Props) {
  const { work, segment } = await params;
  if (!isValidSlug(work)) notFound();

  const parsed = parseSegment(segment);
  if (parsed.kind === "invalid") notFound();

  if (parsed.kind === "vignette") {
    return (
      <QuietPage eyebrow={`Vinyeta ${parsed.number}`} title="La ciutat que deixa ombra">
        Aquesta vinyeta encara no s&apos;ha publicat.
      </QuietPage>
    );
  }

  return (
    <QuietPage eyebrow="Capítol" title={parsed.slug.replace(/-/g, " ")}>
      Aquest capítol encara no s&apos;ha publicat.
    </QuietPage>
  );
}
