import Image from "next/image";
import Link from "next/link";
import type { AucaHrefs, OtherWork } from "@/lib/data/auca";

/** «Altres obres»: enllaços a les altres auques publicades, al peu de la portada. */
export function OtherWorks({ works, hrefs }: { works: OtherWork[]; hrefs: AucaHrefs }) {
  if (works.length === 0) return null;
  return (
    <section aria-labelledby="altres-obres" className="border-t border-line">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-10">
        <h2 id="altres-obres" className="font-mono text-xs uppercase tracking-[var(--tracking-title)] text-smoke">
          Altres obres
        </h2>
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <li key={w.slug}>
              <Link href={hrefs.work(w.slug)} className="group grid gap-4">
                <span className="relative block aspect-[3/2] overflow-hidden bg-ink-soft">
                  {w.cover ? (
                    <Image
                      src={w.cover.src}
                      alt={w.cover.alt}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      quality={60}
                      unoptimized={!w.cover.stable}
                      className="object-cover grayscale-[35%] transition duration-700 ease-[var(--ease-shadow)] group-hover:scale-[1.02] group-hover:grayscale-0"
                    />
                  ) : null}
                </span>
                <span className="grid gap-1">
                  <span className="text-2xl uppercase tracking-[0.08em] group-hover:text-smoke">
                    {w.title}
                    {w.draft ? (
                      <span className="ml-3 inline-block border border-ember/60 px-1.5 py-0.5 align-middle font-mono text-[9px] uppercase tracking-widest text-ember">
                        Esborrany
                      </span>
                    ) : null}
                  </span>
                  {w.subtitle ? <span className="italic text-smoke">{w.subtitle}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
