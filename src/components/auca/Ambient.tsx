"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/**
 * Àudio ambient de l'auca.
 *
 * Viu al layout públic, de manera que continua sonant d'una vinyeta a la següent
 * (la navegació és al client: el <audio> no es desmunta). Mai no sona sol:
 * el visitant l'activa una vegada i la preferència es recorda durant la sessió.
 */
type AmbientCtx = {
  enabled: boolean;
  playing: boolean;
  hasTrack: boolean;
  toggle: () => void;
  setTrack: (track: Track | null) => void;
};

/** `id` identifica el fitxer: la URL signada pot canviar entre vinyetes, però si és el mateix àudio no es talla. */
export type Track = { id: string; src: string };

const Ctx = createContext<AmbientCtx | null>(null);
const KEY = "auca-ambient";
const VOLUME = 0.55;

function readPref(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const noopSubscribe = () => () => {};

function writePref(on: boolean) {
  try {
    window.sessionStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* navegació privada: no passa res */
  }
}

/** Esvaïment suau del volum (sense dependències). Un esvaïment nou cancel·la l'anterior. */
const fades = new WeakMap<HTMLAudioElement, number>();
function fade(audio: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const id = (fades.get(audio) ?? 0) + 1;
  fades.set(audio, id);
  const from = audio.volume;
  const start = performance.now();
  const step = (t: number) => {
    if (fades.get(audio) !== id) return; // l'ha substituït un altre esvaïment
    const k = Math.min(1, (t - start) / ms);
    audio.volume = Math.min(1, Math.max(0, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  // Preferència desada (només al navegador; al servidor sempre "apagat") i canvi explícit del visitant.
  const stored = useSyncExternalStore(noopSubscribe, readPref, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const enabled = choice ?? stored;
  const [playing, setPlaying] = useState(false);
  const [track, setTrackState] = useState<Track | null>(null);

  // Sincronitza el reproductor amb la pista actual i la preferència.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (!enabled || !track) {
      if (!a.paused) fade(a, 0, 600, () => a.pause());
      return;
    }
    const same = a.dataset.track === track.id;
    const start = () => {
      fades.set(a, (fades.get(a) ?? 0) + 1); // atura qualsevol esvaïment pendent
      a.volume = 0;
      a.play()
        .then(() => fade(a, VOLUME, 1200))
        .catch(() => setPlaying(false)); // el navegador pot bloquejar-lo després d'una recàrrega
    };
    if (same) {
      if (a.paused) start();
      return;
    }
    const swap = () => {
      a.src = track.src;
      a.dataset.track = track.id;
      start();
    };
    if (!a.paused) fade(a, 0, 500, swap);
    else swap();
  }, [enabled, track]);

  const toggle = useCallback(() => {
    const next = !enabled;
    writePref(next);
    setChoice(next);
  }, [enabled]);

  const setTrack = useCallback(
    (next: Track | null) => setTrackState((cur) => (cur?.id === next?.id ? cur : next)),
    [],
  );

  const value = useMemo(
    () => ({ enabled, playing, hasTrack: Boolean(track), toggle, setTrack }),
    [enabled, playing, track, toggle, setTrack],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audio}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-hidden
        className="hidden"
      />
    </Ctx.Provider>
  );
}

export function useAmbient(): AmbientCtx | null {
  return useContext(Ctx);
}

/** La vinyeta declara la seva pista ambient (o cap) mentre és a la pantalla. */
export function useAmbientTrack(track: Track | null) {
  const ctx = useAmbient();
  const setTrack = ctx?.setTrack;
  const id = track?.id ?? null;
  const src = track?.src ?? null;
  useEffect(() => {
    if (!setTrack) return;
    setTrack(id && src ? { id, src } : null);
  }, [setTrack, id, src]);
  useEffect(() => () => setTrack?.(null), [setTrack]);
}

export function AmbientToggle() {
  const ctx = useAmbient();
  if (!ctx || !ctx.hasTrack) return null;
  const on = ctx.enabled;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-pressed={on}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-smoke hover:text-paper"
    >
      <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${on && ctx.playing ? "bg-ember" : "border border-smoke"}`} />
      Ambient {on ? "activat" : "apagat"}
    </button>
  );
}
