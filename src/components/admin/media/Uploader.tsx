"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttachTarget } from "@/lib/actions/media";
import { ALLOWED, type MediaKind, type UploadLimits } from "@/lib/media/limits";
import { formatBytes } from "@/lib/format";
import { useUploads, type UploadItem } from "./useUploads";

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  preparing: "Preparant…",
  uploading: "Pujant",
  finalizing: "Registrant…",
  done: "✓ Fet",
  error: "✕ Error",
  cancelled: "Cancel·lat",
};

/**
 * Zona de pujada: arrossegar-i-deixar o seleccionar fitxer, amb progrés i cancel·lació.
 * Amb `target`, el fitxer queda vinculat (i substitueix l'anterior en rols únics).
 */
export function Uploader({
  limits,
  expected,
  target,
  multiple = false,
  label,
  compact = false,
  altText,
}: {
  limits: UploadLimits;
  expected?: MediaKind;
  target?: AttachTarget;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
  altText?: () => string | undefined;
}) {
  const router = useRouter();
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const { items, upload, cancel, clearFinished, busy } = useUploads({
    limits,
    expected,
    target,
    altText,
    onUploaded: () => router.refresh(),
  });

  const kinds: MediaKind[] = expected ? [expected] : ["image", "audio", "video"];
  const accept = kinds.flatMap((k) => [...ALLOWED[k].mimes, ...ALLOWED[k].extensions.map((e) => `.${e}`)]).join(",");
  const hint = kinds
    .map((k) => `${ALLOWED[k].label} · màx. ${formatBytes(limits[k].maxBytes)}`)
    .join("  —  ");

  return (
    <div className="grid gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void upload(multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]!]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed text-center transition-colors focus-within:border-paper ${
          compact ? "px-4 py-4" : "px-6 py-10"
        } ${dragging ? "border-paper bg-ink-soft" : "border-line hover:border-paper/60"}`}
      >
        <span className="font-mono text-xs uppercase tracking-widest">
          {label ?? (multiple ? "Arrossega fitxers aquí o fes clic per triar-los" : "Arrossega un fitxer aquí o fes clic")}
        </span>
        <span className="font-mono text-[10px] text-smoke">{hint}</span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={busy && !multiple}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {items.length > 0 ? (
        <ul className="grid gap-2" aria-live="polite">
          {items.map((it) => (
            <li key={it.id} className="grid gap-1 border border-line px-3 py-2 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate" title={it.name}>
                  {it.name} <span className="text-smoke">· {formatBytes(it.size)}</span>
                </span>
                <span className={`shrink-0 ${it.status === "error" ? "text-ember" : "text-smoke"}`}>
                  {STATUS_LABEL[it.status]}
                  {it.status === "uploading" ? ` ${Math.round(it.progress * 100)}%` : ""}
                </span>
                {["preparing", "uploading"].includes(it.status) ? (
                  <button
                    type="button"
                    onClick={() => cancel(it.id)}
                    className="shrink-0 border border-line px-2 py-0.5 uppercase tracking-widest text-smoke hover:border-paper hover:text-paper"
                  >
                    Cancel·lar
                  </button>
                ) : null}
              </div>
              {["uploading", "finalizing"].includes(it.status) ? (
                <div
                  className="h-0.5 w-full bg-line"
                  role="progressbar"
                  aria-label={`Pujant ${it.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(it.progress * 100)}
                >
                  <div className="h-full bg-paper transition-[width]" style={{ width: `${it.progress * 100}%` }} />
                </div>
              ) : null}
              {it.error ? <p className="text-ember">{it.error}</p> : null}
            </li>
          ))}
          {!busy ? (
            <li>
              <button type="button" onClick={clearFinished} className="font-mono text-[10px] uppercase tracking-widest text-smoke hover:text-paper">
                Netejar la llista
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
