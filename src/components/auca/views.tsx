import Link from "next/link";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { AucaHrefs, ChapterView, Landing, ReaderVignette } from "@/lib/data/auca";
import { formatVignetteNumber } from "@/lib/routing";
import { Cover } from "./Cover";
import { IntroPoem } from "./IntroPoem";
import { Journey } from "./Journey";
import { OtherWorks } from "./OtherWorks";
import { Reader } from "./Reader";

/** Portada + recorregut complet. */
export function LandingView({ landing, hrefs }: { landing: Landing; hrefs: AucaHrefs }) {
  return (
    <>
      <Cover landing={landing} hrefs={hrefs} />
      {landing.total > 0 ? (
        <main id="contingut" className="mx-auto w-full max-w-7xl px-5 pb-32 pt-24 sm:px-10">
          <h2 id="recorregut" className="sr-only scroll-mt-8">
            Recorregut
          </h2>
          <Journey sections={landing.sections} total={landing.total} hrefs={hrefs} />
        </main>
      ) : (
        <span id="contingut" />
      )}
      <OtherWorks works={landing.others} hrefs={hrefs} />
      <Colophon work={landing.work} />
      {landing.poem ? <IntroPoem poem={landing.poem} /> : null}
    </>
  );
}

export function ChapterPageView({ view, hrefs }: { view: ChapterView; hrefs: AucaHrefs }) {
  const first = view.items[0]?.number;
  return (
    <>
      <header className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-12 pt-10 sm:px-10">
        <nav className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke">
          <Link href={hrefs.home} className="hover:text-paper">
            {view.work.title}
          </Link>
          <span aria-hidden> · </span>
          <Link href={hrefs.journey} className="hover:text-paper">
            Recorregut
          </Link>
        </nav>
        <p className="pt-16 font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">Capítol {view.chapter.numeral}</p>
        <h1 className="text-5xl uppercase tracking-[0.1em] sm:text-7xl">{view.chapter.title}</h1>
        {view.chapter.description ? (
          <p className="max-w-2xl text-xl italic leading-relaxed text-smoke">{view.chapter.description}</p>
        ) : null}
        {first ? (
          <Link
            href={hrefs.vignette(first)}
            className="w-fit border border-paper/60 px-8 py-4 font-mono text-xs uppercase tracking-[0.3em] transition-colors duration-500 hover:bg-paper hover:text-ink"
          >
            Començar el capítol
          </Link>
        ) : (
          <p className="italic text-smoke">Aquest capítol encara no té vinyetes publicades.</p>
        )}
      </header>
      <main id="contingut" className="mx-auto w-full max-w-7xl px-5 pb-32 sm:px-10">
        <Journey
          sections={[{ chapter: null, items: view.items }]}
          total={view.total}
          hrefs={hrefs}
          showChapterLinks={false}
        />
      </main>
      <Colophon work={view.work} />
    </>
  );
}

function Colophon({ work }: { work: Landing["work"] }) {
  const credits = [work.credit_photography && `Fotografia: ${work.credit_photography}`, work.credit_text_voice && `Text i veu: ${work.credit_text_voice}`].filter(Boolean);
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-10 font-mono text-[11px] uppercase tracking-[0.2em] text-smoke sm:px-10">
        <span>{work.title}</span>
        {credits.length ? <span>{credits.join(" · ")}</span> : null}
      </div>
    </footer>
  );
}

const DATE = new Intl.DateTimeFormat("ca", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Construeix les props del lector i precarrega NOMÉS la fotografia següent. */
export function ReaderView({ v, hrefs }: { v: ReaderVignette; hrefs: AucaHrefs }) {
  if (v.nextImage) {
    const { props } = getImageProps({
      src: v.nextImage.src,
      alt: "",
      fill: true,
      sizes: "(min-width: 1024px) 66vw, 100vw",
      quality: 85,
      unoptimized: !v.nextImage.stable,
    });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "low" });
  }

  const meta = [
    v.photographer,
    v.location,
    v.photoDate ? DATE.format(new Date(`${v.photoDate}T00:00:00Z`)) : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <Reader
      key={v.number}
      workTitle={v.work.title}
      numberLabel={formatVignetteNumber(v.number, v.total)}
      totalLabel={formatVignetteNumber(v.total, v.total)}
      number={v.number}
      total={v.total}
      title={v.title}
      text={v.text}
      caption={v.caption}
      meta={meta}
      draft={v.draft}
      chapter={v.chapter ? { ...v.chapter, href: hrefs.chapter(v.chapter.slug) } : null}
      image={v.image}
      voice={v.voice}
      ambient={v.ambient}
      video={v.video}
      poster={v.poster}
      prevHref={v.number > 1 ? hrefs.vignette(v.number - 1) : null}
      nextHref={v.number < v.total ? hrefs.vignette(v.number + 1) : null}
      closeHref={`${hrefs.home}#v-${v.number}`}
      homeHref={hrefs.home}
    />
  );
}
