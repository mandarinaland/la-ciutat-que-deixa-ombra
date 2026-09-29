import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWork, listChapters } from "@/lib/data/admin";
import { moveChapterAction } from "@/lib/actions/chapters";
import { ChapterEditForm, CreateChapterForm } from "@/components/admin/ChapterForms";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { buttonClass } from "@/components/admin/styles";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Capítols" };

export default async function ChaptersAdminPage() {
  const work = await getCurrentWork();
  if (!work) {
    return (
      <p className="font-mono text-sm text-smoke">
        Encara no hi ha cap obra. <Link href="/admin/work" className="underline">Crea&apos;n una</Link>.
      </p>
    );
  }
  const chapters = await listChapters(work.id);

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Capítols · {work.title}</p>
          <h1 className="text-3xl">{chapters.length} capítols</h1>
        </div>
        {chapters.length > 1 ? (
          <Link href="/admin/chapters/ordre" className={buttonClass("ghost")}>
            ⇅ Ordenar
          </Link>
        ) : null}
      </header>

      <ol className="divide-y divide-line border-y border-line">
        {chapters.map((c, i) => (
          <li key={c.id} className="py-3">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                <span className="w-8 font-mono text-sm tabular-nums text-smoke">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-40 flex-1 text-lg">{c.title}</span>
                <span className="font-mono text-xs text-smoke">{c.vignette_count} vinyetes</span>
                <StatusBadge status={c.status} gender="m" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Editar ▾</span>
              </summary>
              <ChapterEditForm chapter={c} workSlug={work.slug} />
            </details>
            <div className="mt-2 flex items-center gap-3 pl-12">
              <MoveButtons id={c.id} action={moveChapterAction} isFirst={i === 0} isLast={i === chapters.length - 1} label={c.title} />
              <Link href={`/admin/vignettes?capitol=${c.id}`} className="font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper">
                Vinyetes →
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <details>
        <summary className={`${buttonClass("ghost")} cursor-pointer list-none`}>+ Nou capítol</summary>
        <div className="pt-6">
          <CreateChapterForm workId={work.id} />
        </div>
      </details>
    </section>
  );
}
