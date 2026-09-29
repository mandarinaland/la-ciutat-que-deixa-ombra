import Image from "next/image";
import Link from "next/link";
import type { AucaHrefs, JourneyItem, JourneySection } from "@/lib/data/auca";
import { formatVignetteNumber } from "@/lib/routing";

/**
 * El recorregut: totes les vinyetes en ordre de lectura, agrupades per capítols,
 * compostes com un fotollibre (files justificades que respecten la proporció de cada foto).
 */
export function Journey({
  sections,
  total,
  hrefs,
  showChapterLinks = true,
}: {
  sections: JourneySection[];
  total: number;
  hrefs: AucaHrefs;
  showChapterLinks?: boolean;
}) {
  if (total === 0) return null;
  return (
    <div className="grid gap-24 sm:gap-32">
      {sections.map((s, i) => (
        <section key={`${s.chapter?.slug ?? "solta"}-${i}`} aria-labelledby={`sec-${i}`}
          // Amb centenars de vinyetes, el navegador no pinta els capítols que encara no són a la vista.
          className={`grid gap-10 ${i > 0 ? "[content-visibility:auto] [contain-intrinsic-size:auto_900px]" : ""}`}
        >
          <ChapterHeading section={s} id={`sec-${i}`} hrefs={hrefs} link={showChapterLinks} />
          <Gallery items={s.items} total={total} hrefs={hrefs} />
        </section>
      ))}
    </div>
  );
}

function ChapterHeading({
  section,
  id,
  hrefs,
  link,
}: {
  section: JourneySection;
  id: string;
  hrefs: AucaHrefs;
  link: boolean;
}) {
  const c = section.chapter;
  const first = section.items[0]?.number;
  const last = section.items.at(-1)?.number;
  const range = first && last ? (first === last ? `${first}` : `${first}–${last}`) : "";

  if (!c) {
    return (
      <h2 id={id} className="sr-only">
        Vinyetes {range}
      </h2>
    );
  }
  return (
    <div className="grid gap-4 border-t border-line pt-8 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-10">
      <p className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke" aria-hidden>
        {c.numeral}
      </p>
      <div className="grid gap-3">
        <h2 id={id} className="text-3xl uppercase tracking-[0.12em] sm:text-4xl">
          {link ? (
            <Link href={hrefs.chapter(c.slug)} className="hover:text-smoke">
              {c.title}
            </Link>
          ) : (
            c.title
          )}
          {c.draft ? <DraftMark /> : null}
        </h2>
        {c.description ? <p className="max-w-2xl text-lg italic leading-relaxed text-smoke">{c.description}</p> : null}
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke">
          {section.items.length === 1 ? "1 vinyeta" : `${section.items.length} vinyetes`} · {range}
        </p>
      </div>
    </div>
  );
}

function Gallery({ items, total, hrefs }: { items: JourneyItem[]; total: number; hrefs: AucaHrefs }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-10 [--row:11rem] sm:[--row:14rem] lg:[--row:17rem]">
      {items.map((it) => {
        const ratio = it.image ? it.image.width / it.image.height : 1.5;
        return (
          <li
            key={it.number}
            id={`v-${it.number}`}
            style={{ flexGrow: ratio, flexBasis: `calc(${ratio.toFixed(3)} * var(--row))` }}
            className="min-w-0 scroll-mt-24"
          >
            <Link href={hrefs.vignette(it.number)} className="group grid gap-3" prefetch={false}>
              <span className="relative block overflow-hidden bg-ink-soft" style={{ aspectRatio: `${ratio}` }}>
                {it.image ? (
                  <Image
                    src={it.image.src}
                    alt={it.image.alt}
                    fill
                    sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
                    quality={60}
                    unoptimized={!it.image.stable}
                    className="object-cover grayscale-[35%] transition duration-700 ease-[var(--ease-shadow)] group-hover:scale-[1.02] group-hover:grayscale-0 group-focus-visible:grayscale-0"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-mono text-xs text-smoke">sense foto</span>
                )}
              </span>
              <span className="grid gap-1">
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-smoke">{formatVignetteNumber(it.number, total)}</span>
                  {it.title ? <span className="truncate text-base">{it.title}</span> : null}
                  {it.draft ? <DraftMark /> : null}
                </span>
                {it.excerpt ? (
                  <span className="line-clamp-2 text-sm italic leading-snug text-smoke group-hover:text-paper/80">
                    {it.excerpt}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
      {/* Evita que l'última fila s'estiri fins a omplir tota l'amplada */}
      <li aria-hidden className="grow-[10]" />
    </ol>
  );
}

function DraftMark() {
  return (
    <span className="ml-3 inline-block border border-ember/60 px-1.5 py-0.5 align-middle font-mono text-[9px] uppercase tracking-widest text-ember">
      Esborrany
    </span>
  );
}
