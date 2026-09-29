import type { Metadata } from "next";
import { QuietPage } from "@/components/public/QuietPage";
import { LandingView } from "@/components/auca/views";
import { hrefsFor, loadLanding } from "@/lib/data/auca";
import { landingMetadata } from "@/lib/data/auca-meta";
import { DEFAULT_WORK_SLUG, isSupabaseConfigured } from "@/lib/env";

export const revalidate = 3600;

async function load() {
  return isSupabaseConfigured() ? loadLanding("public", DEFAULT_WORK_SLUG) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await load();
  return landing ? landingMetadata(landing, "/") : {};
}

/** Portada: l'obra per defecte, amb tot el recorregut publicat des de l'administració. */
export default async function HomePage() {
  const landing = await load();
  if (!landing) {
    return (
      <QuietPage eyebrow="Auca de David Teulats · Veu de Piath" title="La ciutat que deixa ombra">
        L&apos;obra encara s&apos;està revelant.
      </QuietPage>
    );
  }
  return <LandingView landing={landing} hrefs={hrefsFor("public", DEFAULT_WORK_SLUG)} />;
}
