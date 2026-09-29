import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentWork, listChapters, listVignettes } from "@/lib/data/admin";
import { resolveMediaSources } from "@/lib/media/sources";
import { createVignetteAction, moveVignetteAction } from "@/lib/actions/vignettes";
import { formatVignetteNumber } from "@/lib/routing";
import { excerpt } from "@/lib/format";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { Thumb } from "@/components/admin/Thumb";
import { buttonClass, inputClass } from "@/components/admin/styles";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Vinyetes" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUSES = ["draft", "published", "archived"] as const;

export default async function VignettesAdminPage({ searchParams }: Props) {
  const work = await getCurrentWork();
  if (!work) {
    return (
      <p className="font-mono text-sm text-smoke">
        Encara no hi ha cap obra. <Link href="/admin/work" className="underline">Crea&apos;n una</Link>.
      </p>
    );
  }

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const estat = STATUSES.find((s) => s === one("estat"));
  const capitol = one("capitol");
  const q = one("q");
  const page = Number(one("pagina") ?? 1) || 1;

  const [list, chapters] = await Promise.all([
    listVignettes(work.id, { status: estat, chapterId: capitol, q, page }),
    listChapters(work.id),
  ]);
  const sources = await resolveMediaSources(
    list.rows.flatMap((r) => (r.main_image ? [r.main_image] : [])),
    "admin",
  );
  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));
  const filtering = Boolean(estat || capitol || q);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (estat) params.set("estat", estat);
    if (capitol) params.set("capitol", capitol);
    if (q) params.set("q", q);
    params.set("pagina", String(p));
    return `/admin/vignettes?${params}`;
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Vinyetes · {work.title}</p>
          <h1 className="text-3xl">
            {list.total} vinyetes{filtering ? <span className="text-smoke"> · {list.filtered} filtrades</span> : null}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/preview/${work.slug}`} className={buttonClass("ghost")}>
            Previsualitza l&apos;auca
          </Link>
          <form action={createVignetteAction}>
            <input type="hidden" name="work_id" value={work.id} />
            {capitol && capitol !== "none" ? <input type="hidden" name="chapter_id" value={capitol} /> : null}
            <button type="submit" className={buttonClass()}>
              + Nova vinyeta
            </button>
          </form>
        </div>
      </header>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Cerca</span>
          <input name="q" defaultValue={q} placeholder="títol, text…" className={`${inputClass} w-56`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Estat</span>
          <select name="estat" defaultValue={estat ?? ""} className={`${inputClass} w-40`}>
            <option value="">Tots</option>
            <option value="published">Publicades</option>
            <option value="draft">Esborranys</option>
            <option value="archived">Arxivades</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Capítol</span>
          <select name="capitol" defaultValue={capitol ?? ""} className={`${inputClass} w-56`}>
            <option value="">Tots</option>
            <option value="none">Sense capítol</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass("ghost")}>
          Filtrar
        </button>
        {filtering ? (
          <Link href="/admin/vignettes" className="pb-2 font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper">
            Netejar
          </Link>
        ) : null}
      </form>

      {list.rows.length === 0 ? (
        <p className="border border-dashed border-line p-10 text-center font-mono text-sm text-smoke">
          {list.total === 0 ? "Encara no hi ha cap vinyeta. Crea la primera." : "Cap vinyeta coincideix amb el filtre."}
        </p>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {list.rows.map((v) => (
            <li key={v.id} className="flex items-center gap-4 py-3">
              <span className="w-12 shrink-0 font-mono text-lg tabular-nums text-smoke">
                {formatVignetteNumber(v.position, list.total)}
              </span>
              <Thumb media={v.main_image} source={v.main_image ? sources.get(v.main_image.id) : undefined} />
              <Link href={`/admin/vignettes/${v.id}`} className="group min-w-0 flex-1">
                <span className="block truncate text-lg group-hover:underline">{v.title || <em className="text-smoke">Sense títol</em>}</span>
                <span className="block truncate font-serif text-sm italic text-smoke">{excerpt(v.piath_text) || "—"}</span>
                <span className="block font-mono text-[11px] text-smoke/80">
                  {v.chapter_id ? chapterTitle.get(v.chapter_id) : "Sense capítol"} · /{v.slug}
                </span>
              </Link>
              <StatusBadge status={v.status} />
              {!filtering ? (
                <MoveButtons
                  id={v.id}
                  action={moveVignetteAction}
                  isFirst={v.position === 1}
                  isLast={v.position === list.total}
                  label={`vinyeta ${v.position}`}
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {list.pages > 1 ? (
        <nav aria-label="Pàgines" className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {Array.from({ length: list.pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              aria-current={p === list.page ? "page" : undefined}
              className={`border px-3 py-1 ${p === list.page ? "border-paper text-paper" : "border-line text-smoke hover:text-paper"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
