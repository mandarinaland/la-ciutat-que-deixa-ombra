import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { routes } from "@/lib/routing";

/**
 * Portada.
 * FASE 11: la imatge de portada (works.cover_media_id) i la frase introductòria
 * (works.intro_text) es llegiran de Supabase. Aquí no s'inventa cap contingut.
 */
export default function HomePage() {
  return (
    <main id="contingut" className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <h1 className="text-4xl leading-tight uppercase tracking-[var(--tracking-title)] sm:text-6xl">
          La ciutat
          <br />
          que deixa ombra
        </h1>
        <p className="text-lg italic text-smoke sm:text-xl">{siteConfig.tagline}</p>

        {/* Marc de la fotografia de portada (FASE 11). Proporció fixa per evitar salts de layout. */}
        <div aria-hidden className="aspect-[3/2] w-full border border-line bg-ink-soft" />

        <Link
          href={routes.auca()}
          className="border border-paper/60 px-10 py-4 font-mono text-xs uppercase tracking-[0.3em] transition-colors duration-500 ease-[var(--ease-shadow)] hover:bg-paper hover:text-ink"
        >
          Començar
        </Link>
      </div>
    </main>
  );
}
