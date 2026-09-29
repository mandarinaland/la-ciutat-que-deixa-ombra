import type { Metadata } from "next";
import Link from "next/link";
import { listMedia } from "@/lib/data/media";
import { getUploadLimits } from "@/lib/data/settings";
import { resolveMediaSources } from "@/lib/media/sources";
import { MediaCard } from "@/components/admin/media/MediaCard";
import { Uploader } from "@/components/admin/media/Uploader";
import { buttonClass, inputClass } from "@/components/admin/styles";

export const metadata: Metadata = { title: "Mediateca" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { key: "image", label: "Imatges" },
  { key: "audio", label: "Àudios" },
  { key: "video", label: "Vídeos" },
] as const;

export default async function MediaAdminPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const tipus = TABS.find((t) => t.key === one("tipus"))?.key ?? "image";
  const q = one("q");
  const page = Number(one("pagina") ?? 1) || 1;

  const [list, limits] = await Promise.all([listMedia({ type: tipus, q, page }), getUploadLimits()]);
  // Àudio i vídeo: l'enllaç només es fa servir si l'usuari prem play (preload="none").
  const sources = await resolveMediaSources(list.items, "admin");

  const href = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tipus, q, ...params })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/admin/media?${u}`;
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="border-b border-line pb-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-smoke">Mediateca</p>
        <h1 className="text-3xl">
          {list.total} {tipus === "image" ? "imatges" : tipus === "audio" ? "àudios" : "vídeos"}
          {q ? <span className="text-smoke"> · «{q}»</span> : null}
        </h1>
      </header>

      <nav aria-label="Tipus de fitxer" className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/media?tipus=${t.key}`}
            aria-current={t.key === tipus ? "page" : undefined}
            className={`border px-4 py-2 font-mono text-[11px] uppercase tracking-widest ${
              t.key === tipus ? "border-paper text-paper" : "border-line text-smoke hover:text-paper"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Uploader limits={limits} multiple label="Arrossega aquí fotografies, àudios o vídeos (o fes clic)" />

      <form className="flex flex-wrap items-end gap-3" role="search">
        <input type="hidden" name="tipus" value={tipus} />
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-widest text-smoke">Cerca</span>
          <input name="q" defaultValue={q} placeholder="nom o text alternatiu" className={`${inputClass} w-72`} />
        </label>
        <button type="submit" className={buttonClass("ghost")}>
          Cercar
        </button>
        {q ? (
          <Link href={`/admin/media?tipus=${tipus}`} className="pb-2 font-mono text-[11px] uppercase tracking-widest text-smoke hover:text-paper">
            Netejar
          </Link>
        ) : null}
      </form>

      {list.items.length === 0 ? (
        <p className="border border-dashed border-line p-10 text-center font-mono text-sm text-smoke">
          {q ? "Cap fitxer coincideix amb la cerca." : "Encara no hi ha fitxers d'aquest tipus."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.items.map((item) => {
            const s = sources.get(item.id);
            return (
              <MediaCard
                key={item.id}
                item={item}
                url={s?.url ?? null}
                stable={s?.kind === "file" ? s.stable !== false : true}
              />
            );
          })}
        </ul>
      )}

      {list.pages > 1 ? (
        <nav aria-label="Pàgines" className="flex flex-wrap gap-2 font-mono text-xs">
          {Array.from({ length: list.pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={href({ pagina: p })}
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
