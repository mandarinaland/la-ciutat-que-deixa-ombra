import { notFound } from "next/navigation";
import { QuietPage } from "@/components/public/QuietPage";
import { isValidSlug } from "@/lib/routing";

type Props = { params: Promise<{ slug: string }> };

/**
 * FASE 11: capítol de l'obra per defecte.
 * URL canònica: /auca/[work]/[chapter] (aquesta ruta hi apuntarà amb `alternates.canonical`).
 */
export default async function ChapterPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  return <QuietPage eyebrow="Capítol" title={slug.replace(/-/g, " ")} />;
}
