import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { LandingView } from "@/components/auca/views";
import { hrefsFor, loadLanding } from "@/lib/data/auca";
import { landingMetadata } from "@/lib/data/auca-meta";
import { DEFAULT_WORK_SLUG } from "@/lib/env";
import { isValidSlug, routes } from "@/lib/routing";

export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ work: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work } = await params;
  if (!isValidSlug(work)) return {};
  const landing = await loadLanding("public", work);
  return landing ? landingMetadata(landing, routes.work(work)) : {};
}

/** Portada i recorregut d'una obra. L'obra per defecte viu a "/". */
export default async function WorkPage({ params }: Props) {
  const { work } = await params;
  if (!isValidSlug(work)) notFound();
  if (work === DEFAULT_WORK_SLUG) permanentRedirect(routes.home());
  const landing = await loadLanding("public", work);
  if (!landing) notFound();
  return <LandingView landing={landing} hrefs={hrefsFor("public", work)} />;
}
