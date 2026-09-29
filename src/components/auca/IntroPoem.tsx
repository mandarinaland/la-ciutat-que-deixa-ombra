"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AucaFile } from "@/lib/data/auca";
import { formatDuration } from "@/lib/format";

/**
 * El poema de la portada, en veu de Piath, de fons.
 *
 * Els navegadors no deixen sonar una pàgina sense cap gest del visitant. Per això:
 *  1. en entrar s'intenta reproduir;
 *  2. si el navegador ho bloqueja, comença al primer toc, clic o tecla a la portada
 *     (excepte si aquest toc és un enllaç que porta a una altra pàgina);
 *  3. sempre hi ha un control per pausar-lo. Si el visitant el pausa, o ja l'ha escoltat
 *     sencer, no torna a començar sol durant la sessió.
 */
type Status = "idle" | "waiting" | "playing" | "paused" | "ended";

const KEY = "auca-poem";
const VOLUME = 0.9;

function readState(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writeState(value: "paused" | "heard" | null) {
  try {
    if (value) window.sessionStorage.setItem(KEY, value);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* navegació privada */
  }
}

/** Gestos que els navegadors accepten per començar un so. */
const GESTURES = ["pointerup", "touchend", "keydown", "click"] as const;

export function IntroPoem({ poem, label = "Vic · poema en veu de Piath" }: { poem: AucaFile; label?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(poem.duration ?? 0);

  const start = useCallback(() => {
    const a = audio.current;
    if (!a) return Promise.reject(new Error("no-audio"));
    a.volume = 0;
    return a.play().then(() => {
      // Entrada suau
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, Math.max(0, (t - t0) / 1500));
        a.volume = VOLUME * k;
        if (k < 1 && !a.paused) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, []);

  useEffect(() => {
    const remembered = readState();
    if (remembered === "paused" || remembered === "heard") return; // respecta el que el visitant ja ha decidit

    let armed = false;
    const onGesture = (e: Event) => {
      const target = e.target as Element | null;
      // El control del poema ja s'ocupa dels seus clics.
      if (target?.closest("[data-poem-control]")) return disarm();
      // Un enllaç a una altra pàgina: no comencem un so que es tallaria de seguida.
      const link = target?.closest("a");
      if (link && !link.getAttribute("href")?.startsWith("#")) return;
      disarm();
      start().catch(() => setStatus("paused"));
    };
    const arm = () => {
      armed = true;
      setStatus("waiting");
      for (const g of GESTURES) document.addEventListener(g, onGesture, { capture: true });
    };
    const disarm = () => {
      if (!armed) return;
      armed = false;
      for (const g of GESTURES) document.removeEventListener(g, onGesture, { capture: true });
    };

    start().catch(arm);
    return disarm;
  }, [start]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      writeState(null);
      if (status === "ended") a.currentTime = 0;
      start().catch(() => setStatus("paused"));
    } else {
      a.pause();
      writeState("paused");
    }
  };

  const progress = total ? Math.min(100, (time / total) * 100) : 0;
  const playing = status === "playing";

  return (
    <div
      data-poem-control
      className="fixed bottom-4 right-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-3 border border-paper/25 bg-ink/85 py-2 pl-2 pr-4 backdrop-blur sm:bottom-6 sm:right-6"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausa el poema" : "Escolta el poema"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-paper/60 transition-colors hover:bg-paper hover:text-ink"
      >
        {playing ? (
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <rect x="3" y="2" width="3.5" height="12" />
            <rect x="9.5" y="2" width="3.5" height="12" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5 fill-current">
            <path d="M3 1.5v13l11-6.5z" />
          </svg>
        )}
      </button>
      <div className="grid min-w-0 gap-1">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-paper/90" aria-live="polite">
          {status === "waiting" ? "Toca per escoltar el poema" : label}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-28 bg-line sm:w-40" aria-hidden>
            <span className="block h-px bg-paper/80 transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </span>
          <span className="font-mono text-[10px] tabular-nums text-smoke">
            {formatDuration(time)} / {formatDuration(total)}
          </span>
        </span>
      </div>
      <audio
        ref={audio}
        src={poem.src}
        preload="auto"
        onPlay={() => setStatus("playing")}
        onPause={(e) => {
          if (!e.currentTarget.ended) setStatus("paused");
        }}
        onEnded={() => {
          setStatus("ended");
          writeState("heard");
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
      />
    </div>
  );
}
