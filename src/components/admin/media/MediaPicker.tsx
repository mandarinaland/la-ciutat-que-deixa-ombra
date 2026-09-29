"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { searchMediaAction, type PickerItem } from "@/lib/actions/media";
import type { MediaKind } from "@/lib/media/limits";
import { formatDuration } from "@/lib/format";
import { buttonClass, inputClass } from "../styles";

/**
 * Selector de la mediateca (diàleg natiu: ESC tanca, focus atrapat pel navegador).
 * Permet reutilitzar un mateix fitxer en diverses vinyetes.
 */
export function MediaPicker({
  kind,
  onPick,
  label = "Triar de la mediateca",
}: {
  kind: MediaKind;
  onPick: (item: PickerItem) => Promise<void> | void;
  label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    (nextPage: number, query: string, append: boolean) => {
      startTransition(async () => {
        const res = await searchMediaAction({ type: kind, q: query || undefined, page: nextPage });
        if (!res.ok || !res.data) {
          setError(res.ok ? "Error" : res.error);
          return;
        }
        setError(null);
        setItems((prev) => (append ? [...prev, ...res.data!.items] : res.data!.items));
        setHasMore(res.data.hasMore);
        setPage(nextPage);
      });
    },
    [kind],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => setQ("");
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        className={buttonClass("ghost")}
        onClick={() => {
          dialog.current?.showModal();
          load(1, "", false);
        }}
      >
        {label}
      </button>

      <dialog
        ref={dialog}
        aria-label="Mediateca"
        className="m-auto w-[min(960px,92vw)] border border-line bg-ink p-0 text-paper backdrop:bg-black/70"
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <form
            role="search"
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(1, q, false);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca per nom o text alternatiu…"
              className={inputClass}
              aria-label="Cerca a la mediateca"
            />
            <button type="submit" className={buttonClass("ghost")}>
              Cercar
            </button>
          </form>
          <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost")} aria-label="Tancar">
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {error ? <p className="font-mono text-xs text-ember">{error}</p> : null}
          {!pending && items.length === 0 && !error ? (
            <p className="p-8 text-center font-mono text-xs text-smoke">No hi ha cap fitxer d&apos;aquest tipus.</p>
          ) : null}

          <ul className={kind === "image" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" : "grid gap-2"}>
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await onPick(it);
                      dialog.current?.close();
                    })
                  }
                  className="group grid w-full gap-1 border border-line p-2 text-left hover:border-paper focus-visible:border-paper disabled:opacity-50"
                >
                  {kind === "image" ? (
                    <span className="relative block aspect-square w-full overflow-hidden bg-ink-soft">
                      {it.url ? (
                        <Image
                          src={it.url}
                          alt={it.alt_text ?? ""}
                          fill
                          sizes="200px"
                          quality={60}
                          unoptimized={!it.stable}
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                  ) : null}
                  <span className="truncate font-mono text-[11px]">{it.filename}</span>
                  <span className="font-mono text-[10px] text-smoke">
                    {kind === "image" ? `${it.width ?? "?"}×${it.height ?? "?"}` : formatDuration(it.duration)}
                    {kind === "image" && !it.alt_text ? " · sense alt" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {hasMore ? (
            <div className="pt-4 text-center">
              <button type="button" disabled={pending} onClick={() => load(page + 1, q, true)} className={buttonClass("ghost")}>
                {pending ? "Carregant…" : "Carregar-ne més"}
              </button>
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
