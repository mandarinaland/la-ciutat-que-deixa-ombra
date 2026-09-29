import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWork, listChapters, listVignettesForOrdering } from "@/lib/data/admin";
import { resolveMediaSources } from "@/lib/media/sources";
import { reorderVignettesAction } from "@/lib/actions/vignettes";
import { excerpt } from "@/lib/format";
import { SortableList, type SortableRow } from "@/components/admin/SortableList";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Ordenar vinyetes" };

export default async function OrderVignettesPage() {
  const work = await getCurrentWork();
  if (!work) return <p className="font-mono text-sm text-smoke">Encara no hi ha cap obra.</p>;

  const [vignettes, chapters] = await Promise.all([listVignettesForOrdering(work.id), listChapters(work.id)]);
  const sources = await resolveMediaSources(vignettes.flatMap((v) => (v.main_image ? [v.main_image] : [])), "admin");
  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));

  const rows: SortableRow[] = vignettes.map((v) => {
    const s = v.main_image ? sources.get(v.main_image.id) : undefined;
    return {
      id: v.id,
      title: v.title || "Sense títol",
      subtitle: excerpt(v.piath_text) || undefined,
      meta: `${v.chapter_id ? chapterTitle.get(v.chapter_id) : "Sense capítol"} · /${v.slug}`,
      badge: <StatusBadge status={v.status} />,
      thumb: s && s.kind === "file" ? { src: s.url, alt: v.main_image?.alt_text ?? "", stable: s.stable !== false } : null,
    };
  });

  const save = reorderVignettesAction.bind(null, work.id);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
            <Link href="/admin/vignettes" className="hover:text-paper">
              ← Vinyetes
            </Link>{" "}
            · {work.title}
          </p>
          <h1 className="text-3xl">Ordenar vinyetes</h1>
          <p className="mt-2 max-w-2xl text-sm text-smoke">
            L&apos;ordre d&apos;aquí és l&apos;ordre de lectura de l&apos;auca: la numeració pública (01, 02…) es calcula a partir d&apos;aquest
            ordre. Els capítols es mostren allà on apareix la seva primera vinyeta.
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="border border-dashed border-line p-10 text-center font-mono text-sm text-smoke">Encara no hi ha cap vinyeta.</p>
      ) : (
        <SortableList rows={rows} noun={{ one: "vinyeta", many: "vinyetes" }} save={save} />
      )}
    </section>
  );
}
