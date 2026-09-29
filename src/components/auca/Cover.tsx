import Image from "next/image";
import Link from "next/link";
import type { AucaHrefs, Landing } from "@/lib/data/auca";

/**
 * Portada a pantalla completa: la fotografia de portada, el títol i la frase d'entrada.
 * Tot surt de l'obra (taula `works`); si encara no hi ha portada, queda només la tipografia.
 */
export function Cover({ landing, hrefs }: { landing: Landing; hrefs: AucaHrefs }) {
  const { work, cover, total } = landing;
  const credits = [
    work.credit_photography ? { label: "Fotografia", name: work.credit_photography } : null,
    work.credit_text_voice ? { label: "Text i veu", name: work.credit_text_voice } : null,
  ].filter((c): c is { label: string; name: string } => Boolean(c));

  return (
    <header className="relative flex min-h-dvh flex-col justify-end overflow-hidden">
      {cover ? (
        <div className="absolute inset-0">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            priority
            sizes="100vw"
            quality={75}
            unoptimized={!cover.stable}
            className="cover-reveal object-cover"
          />
          {/* Ombra: la foto s'enfosqueix cap a baix perquè el text sempre es llegeixi */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
        </div>
      ) : null}

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-32 sm:px-10 sm:pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[var(--tracking-title)] text-smoke">
          Auca{total > 0 ? ` · ${total} vinyetes` : ""}
        </p>
        <h1 className="max-w-4xl text-5xl leading-[0.95] uppercase tracking-[0.08em] text-balance sm:text-7xl lg:text-8xl">
          {work.title}
        </h1>
        {work.subtitle ? <p className="text-xl italic text-paper/80 sm:text-2xl">{work.subtitle}</p> : null}
        {work.intro_text ? (
          <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-paper/85 sm:text-xl">{work.intro_text}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          {total > 0 ? (
            <Link
              href={hrefs.vignette(1)}
              className="border border-paper bg-paper px-8 py-4 font-mono text-xs uppercase tracking-[0.3em] text-ink transition-colors duration-500 ease-[var(--ease-shadow)] hover:bg-transparent hover:text-paper"
            >
              Començar
            </Link>
          ) : null}
          {total > 0 ? (
            <a
              href="#recorregut"
              className="border border-paper/40 px-8 py-4 font-mono text-xs uppercase tracking-[0.3em] text-paper transition-colors duration-500 ease-[var(--ease-shadow)] hover:border-paper"
            >
              Recorregut ↓
            </a>
          ) : (
            <p className="italic text-smoke">Les vinyetes encara s&apos;estan revelant.</p>
          )}
        </div>

        {credits.length > 0 ? (
          <dl className="flex flex-wrap gap-x-10 gap-y-2 border-t border-paper/15 pt-6 font-mono text-[11px] uppercase tracking-[0.2em]">
            {credits.map((c) => (
              <div key={c.label} className="flex gap-3">
                <dt className="text-smoke">{c.label}</dt>
                <dd>{c.name}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
