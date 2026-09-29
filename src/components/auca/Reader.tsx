"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AucaFile, AucaImage } from "@/lib/data/auca";
import { AmbientToggle, useAmbientTrack } from "./Ambient";
import { VoicePlayer } from "./VoicePlayer";

export type ReaderProps = {
  workTitle: string;
  numberLabel: string; // "07"
  totalLabel: string; // "49"
  number: number;
  total: number;
  title: string | null;
  text: string | null;
  caption: string | null;
  meta: string[]; // fotògraf, lloc, data
  draft: boolean;
  chapter: { title: string; numeral: string; href: string } | null;
  image: AucaImage | null;
  voice: AucaFile | null;
  ambient: AucaFile | null;
  video: AucaFile | null;
  poster: AucaImage | null;
  prevHref: string | null;
  nextHref: string | null;
  closeHref: string;
  homeHref: string;
};

/**
 * Lectura d'una vinyeta: la fotografia com a protagonista i, al costat, la veu de Piath.
 * Teclat (← → Esc), lliscar amb el dit, i la vinyeta següent ja precarregada pel servidor.
 */
export function Reader(p: ReaderProps) {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useAmbientTrack(p.ambient);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "ArrowRight" && p.nextHref) router.push(p.nextHref, { scroll: true });
      else if (e.key === "ArrowLeft" && p.prevHref) router.push(p.prevHref, { scroll: true });
      else if (e.key === "Escape") router.push(p.closeHref);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, p.nextHref, p.prevHref, p.closeHref]);

  const progress = p.total ? (p.number / p.total) * 100 : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Capçalera */}
      <header className="flex items-center justify-between gap-4 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.2em] sm:px-8">
        <Link href={p.homeHref} className="truncate text-smoke hover:text-paper">
          {p.workTitle}
        </Link>
        <p className="shrink-0 tabular-nums" aria-label={`Vinyeta ${p.number} de ${p.total}`}>
          {p.numberLabel} <span className="text-smoke">/ {p.totalLabel}</span>
        </p>
        <Link href={p.closeHref} aria-label="Tancar i tornar al recorregut" className="shrink-0 px-2 text-base text-smoke hover:text-paper">
          ✕
        </Link>
      </header>

      <main
        id="contingut"
        className="grid flex-1 gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:gap-12"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          const t = e.changedTouches[0];
          touch.current = null;
          if (!s || !t) return;
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx < 0 && p.nextHref) router.push(p.nextHref);
          if (dx > 0 && p.prevHref) router.push(p.prevHref);
        }}
      >
        {/* La fotografia (o el vídeo) */}
        <figure className="grid content-center gap-3">
          <div className="relative h-[62dvh] w-full sm:h-[70dvh] lg:h-[calc(100dvh-10rem)]">
            {showVideo && p.video ? (
              <video
                key={p.video.src}
                src={p.video.src}
                poster={p.poster?.src}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full bg-black object-contain"
                aria-label={`Vídeo de la vinyeta ${p.number}`}
              />
            ) : p.image ? (
              <Image
                key={p.image.src}
                src={p.image.src}
                alt={p.image.alt}
                fill
                priority
                sizes="(min-width: 1024px) 66vw, 100vw"
                quality={85}
                unoptimized={!p.image.stable}
                className="photo-reveal object-contain"
              />
            ) : (
              <div className="grid h-full place-items-center border border-dashed border-line font-mono text-xs text-smoke">
                Aquesta vinyeta encara no té fotografia.
              </div>
            )}
          </div>
          {p.caption || p.meta.length > 0 ? (
            <figcaption className="flex flex-wrap justify-between gap-x-6 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-smoke">
              <span>{p.caption}</span>
              <span>{p.meta.join(" · ")}</span>
            </figcaption>
          ) : null}
        </figure>

        {/* La veu */}
        <article className="grid content-center gap-8 lg:py-8">
          <div className="grid gap-3">
            {p.chapter ? (
              <Link href={p.chapter.href} className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke hover:text-paper">
                {p.chapter.numeral} · {p.chapter.title}
              </Link>
            ) : null}
            {p.title ? <h1 className="text-3xl italic leading-tight sm:text-4xl">{p.title}</h1> : <h1 className="sr-only">Vinyeta {p.number}</h1>}
            {p.draft ? (
              <p className="w-fit border border-ember/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ember">
                Esborrany — només visible a la previsualització
              </p>
            ) : null}
          </div>

          {p.text ? (
            <div className="whitespace-pre-line text-xl leading-relaxed text-paper/90 sm:text-2xl sm:leading-relaxed">{p.text}</div>
          ) : null}

          <div className="grid gap-5 border-t border-line pt-6">
            {p.voice ? <VoicePlayer key={p.voice.src} src={p.voice.src} duration={p.voice.duration} /> : null}
            <div className="flex flex-wrap items-center gap-6">
              {p.video ? (
                <button
                  type="button"
                  onClick={() => setShowVideo((v) => !v)}
                  aria-pressed={showVideo}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke hover:text-paper"
                >
                  {showVideo ? "← Tornar a la fotografia" : "▶ Veure el vídeo"}
                </button>
              ) : null}
              <AmbientToggle />
            </div>
          </div>
        </article>
      </main>

      {/* Navegació */}
      <nav aria-label="Navegació de l'auca" className="sticky bottom-0 bg-ink/90 backdrop-blur">
        <div className="h-px w-full bg-line">
          <div className="h-px bg-paper/70 transition-[width] duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] sm:px-8">
          {p.prevHref ? (
            <Link href={p.prevHref} rel="prev" className="py-2 text-smoke hover:text-paper">
              ← Anterior
            </Link>
          ) : (
            <span className="py-2 text-smoke/40">← Anterior</span>
          )}
          <span className="hidden text-smoke sm:inline">← → per passar · Esc per sortir</span>
          {p.nextHref ? (
            <Link href={p.nextHref} rel="next" className="py-2 hover:text-smoke">
              Següent →
            </Link>
          ) : (
            <Link href={p.closeHref} className="py-2 hover:text-smoke">
              Fi · Tornar al recorregut
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
