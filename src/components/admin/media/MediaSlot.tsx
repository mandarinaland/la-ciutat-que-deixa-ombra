"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attachMediaAction, detachMediaAction, updateAltTextAction, type AttachTarget } from "@/lib/actions/media";
import type { MediaItem } from "@/lib/data/types";
import type { MediaKind, UploadLimits } from "@/lib/media/limits";
import { formatBytes, formatDuration } from "@/lib/format";
import { buttonClass, inputClass, labelClass } from "../styles";
import { MediaPicker } from "./MediaPicker";
import { Uploader } from "./Uploader";

export type SlotMedia = { media: MediaItem & { filename?: string; size?: number }; url: string | null; stable: boolean };

/**
 * Una "ranura" multimèdia de l'editor: fotografia, veu, vídeo, pòster o portada.
 * Pujar (o substituir), triar de la mediateca, editar el text alternatiu i treure.
 */
export function MediaSlot({
  title,
  kind,
  target,
  current,
  limits,
  required = false,
}: {
  title: string;
  kind: MediaKind;
  target: NonNullable<AttachTarget>;
  current: SlotMedia | null;
  limits: UploadLimits;
  required?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const altRef = useRef<HTMLInputElement>(null);
  const newAltRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? (res.message ? { ok: true, text: res.message } : null) : { ok: false, text: res.error ?? "Error" });
      if (res.ok) router.refresh();
    });

  const m = current?.media;

  return (
    <section className="grid gap-4 border-t border-line pt-6" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={labelClass}>
          {title}
          {required ? <span className="text-ember"> *</span> : null}
        </h2>
        {m ? (
          <span className="truncate font-mono text-[10px] text-smoke">
            {m.filename ?? m.mime_type}
            {m.size ? ` · ${formatBytes(m.size)}` : ""}
            {kind !== "image" ? ` · ${formatDuration(m.duration)}` : m.width ? ` · ${m.width}×${m.height}` : ""}
          </span>
        ) : null}
      </div>

      {/* Previsualització */}
      {m && current?.url ? (
        kind === "image" ? (
          <div
            className="relative w-full overflow-hidden bg-ink-soft"
            style={{ aspectRatio: `${m.width ?? 3} / ${m.height ?? 2}`, maxHeight: "70vh" }}
          >
            <Image
              src={current.url}
              alt={m.alt_text ?? ""}
              fill
              sizes="(min-width: 1280px) 45vw, 90vw"
              quality={75}
              unoptimized={!current.stable}
              className="object-contain"
            />
          </div>
        ) : kind === "audio" ? (
          <audio controls preload="none" src={current.url} className="w-full" aria-label={`${title}: ${m.filename ?? ""}`} />
        ) : (
          <video controls preload="metadata" src={current.url} className="w-full bg-black" aria-label={`${title}: ${m.filename ?? ""}`} />
        )
      ) : m ? (
        <p className="border border-dashed border-line p-6 text-center font-mono text-xs text-smoke">
          Fitxer vinculat, però no s&apos;ha pogut generar l&apos;enllaç de previsualització.
        </p>
      ) : null}

      {/* Text alternatiu (imatges) */}
      {m && kind === "image" ? (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateAltTextAction(m.id, altRef.current?.value ?? ""));
          }}
        >
          <label htmlFor={`alt-${m.id}`} className={labelClass}>
            Text alternatiu {m.alt_text ? null : <span className="text-ember">(obligatori per publicar)</span>}
          </label>
          <div className="flex gap-2">
            <input
              id={`alt-${m.id}`}
              ref={altRef}
              key={m.id}
              defaultValue={m.alt_text ?? ""}
              placeholder="Què es veu a la fotografia?"
              className={inputClass}
              maxLength={1000}
            />
            <button type="submit" disabled={pending} className={buttonClass("ghost")}>
              Desar
            </button>
          </div>
        </form>
      ) : null}

      {/* Pujar o substituir */}
      {!m && kind === "image" ? (
        <div className="grid gap-2">
          <label htmlFor={`newalt-${title}`} className={labelClass}>
            Text alternatiu (es desa amb la foto)
          </label>
          <input id={`newalt-${title}`} ref={newAltRef} placeholder="Què es veu a la fotografia?" className={inputClass} maxLength={1000} />
        </div>
      ) : null}

      <Uploader
        limits={limits}
        expected={kind}
        target={target}
        compact={Boolean(m)}
        label={m ? "Substituir: arrossega un fitxer nou o fes clic" : undefined}
        altText={() => newAltRef.current?.value || undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <MediaPicker
          kind={kind}
          onPick={async (item) => {
            // S'espera l'acció perquè el diàleg no es tanqui abans de vincular el fitxer.
            const res = await attachMediaAction(item.id, target);
            setMessage(res.ok ? null : { ok: false, text: res.error ?? "Error" });
            if (res.ok) router.refresh();
          }}
        />
        {m ? (
          confirmRemove ? (
            <span className="inline-flex gap-2">
              <button
                type="button"
                disabled={pending}
                className={buttonClass("danger")}
                onClick={() => {
                  setConfirmRemove(false);
                  run(() => detachMediaAction(target, m.id));
                }}
              >
                Confirmar
              </button>
              <button type="button" className={buttonClass("ghost")} onClick={() => setConfirmRemove(false)}>
                Cancel·lar
              </button>
            </span>
          ) : (
            <button type="button" className={buttonClass("ghost")} onClick={() => setConfirmRemove(true)}>
              Treure
            </button>
          )
        ) : null}
        {pending ? <span className="font-mono text-[11px] text-smoke">…</span> : null}
        {message ? (
          <span role={message.ok ? "status" : "alert"} className={`font-mono text-[11px] ${message.ok ? "text-smoke" : "text-ember"}`}>
            {message.ok ? "✓ " : "✕ "}
            {message.text}
          </span>
        ) : null}
      </div>
      {m ? (
        <p className="font-mono text-[10px] text-smoke/80">Treure no esborra el fitxer: continua a la mediateca.</p>
      ) : null}
    </section>
  );
}
