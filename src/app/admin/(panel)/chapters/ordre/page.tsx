import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWork, listChapters } from "@/lib/data/admin";
import { reorderChaptersAction } from "@/lib/actions/chapters";
import { SortableList, type SortableRow } from "@/components/admin/SortableList";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Ordenar capítols" };

export default async function OrderChaptersPage() {
  const work = await getCurrentWork();
  if (!work) return <p className="font-mono text-sm text-smoke">Encara no hi ha cap obra.</p>;
  const chapters = await listChapters(work.id);

  const rows: SortableRow[] = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    meta: `${c.vignette_count} vinyetes · /${c.slug}`,
    badge: <StatusBadge status={c.status} gender="m" />,
  }));

  return (
    <section className="flex flex-col gap-6">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">
          <Link href="/admin/chapters" className="hover:text-paper">
            ← Capítols
          </Link>{" "}
          · {work.title}
        </p>
        <h1 className="text-3xl">Ordenar capítols</h1>
        <p className="mt-2 max-w-2xl text-sm text-smoke">
          Defineix la numeració dels capítols (I, II, III…). L&apos;ordre de lectura el marquen les vinyetes.
        </p>
      </header>
      <SortableList rows={rows} noun={{ one: "capítol", many: "capítols" }} save={reorderChaptersAction.bind(null, work.id)} />
    </section>
  );
}
