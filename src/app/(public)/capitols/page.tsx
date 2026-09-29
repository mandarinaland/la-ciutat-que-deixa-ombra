import type { Metadata } from "next";
import Link from "next/link";
import { QuietPage } from "@/components/public/QuietPage";
import { hrefsFor, listChaptersFor } from "@/lib/data/auca";
import { DEFAULT_WORK_SLUG, isSupabaseConfigured } from "@/lib/env";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Capítols", alternates: { canonical: "/capitols" } };

/** Índex de capítols publicats de l'obra per defecte. */
export default async function ChaptersPage() {
  const data = isSupabaseConfigured() ? await listChaptersFor("public", DEFAULT_WORK_SLUG) : null;
  if (!data || data.chapters.length === 0) {
    return <QuietPage eyebrow="Índex" title="Capítols">Encara no hi ha cap capítol publicat.</QuietPage>;
  }
  const hrefs = hrefsFor("public", DEFAULT_WORK_SLUG);
  return (
    <main id="contingut" className="mx-auto grid min-h-dvh w-full max-w-4xl content-start gap-12 px-5 py-16 sm:px-10">
      <nav className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke">
        <Link href={hrefs.home} className="hover:text-paper">
          {data.work.title}
        </Link>
      </nav>
      <h1 className="text-5xl uppercase tracking-[0.1em]">Capítols</h1>
      <ol className="grid">
        {data.chapters.map(({ chapter, count }) => (
          <li key={chapter.slug} className="border-t border-line">
            <Link href={hrefs.chapter(chapter.slug)} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-baseline gap-4 py-6 hover:text-smoke">
              <span className="font-mono text-xs text-smoke">{chapter.numeral}</span>
              <span className="text-2xl uppercase tracking-[0.08em]">{chapter.title}</span>
              <span className="font-mono text-[11px] text-smoke">{count}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
