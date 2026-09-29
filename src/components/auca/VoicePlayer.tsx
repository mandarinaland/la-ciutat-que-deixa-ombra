"use client";

import { useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

/**
 * La veu de Piath. Només sona quan el visitant ho demana.
 * Reproductor mínim i accessible: botó, barra (input range) i temps.
 * Qui l'usa li dona `key={src}`: canviar de vinyeta en reinicia l'estat.
 */
export function VoicePlayer({ src, duration, label = "Escolta la veu de Piath" }: { src: string; duration: number | null; label?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [error, setError] = useState(false);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausa la veu" : label}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-paper/60 transition-colors hover:bg-paper hover:text-ink"
        >
          {playing ? (
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 fill-current">
              <rect x="3" y="2" width="3.5" height="12" />
              <rect x="9.5" y="2" width="3.5" height="12" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 16 16" className="ml-0.5 h-4 w-4 fill-current">
              <path d="M3 1.5v13l11-6.5z" />
            </svg>
          )}
        </button>
        <div className="grid flex-1 gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-smoke">{label}</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={total || 1}
              step={0.1}
              value={time}
              aria-label="Posició de la veu"
              aria-valuetext={`${formatDuration(time)} de ${formatDuration(total)}`}
              onChange={(e) => {
                const a = audio.current;
                if (a) a.currentTime = Number(e.target.value);
                setTime(Number(e.target.value));
              }}
              className="voice-range h-4 flex-1"
              style={{ ["--p" as string]: `${total ? (time / total) * 100 : 0}%` }}
            />
            <span className="font-mono text-[11px] tabular-nums text-smoke">
              {formatDuration(time)} / {formatDuration(total)}
            </span>
          </div>
        </div>
      </div>
      {error ? <p className="font-mono text-[11px] text-ember">No s&apos;ha pogut reproduir l&apos;àudio.</p> : null}
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
        onError={() => setError(true)}
      />
    </div>
  );
}
