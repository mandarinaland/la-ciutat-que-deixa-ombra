"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMediaAction, updateAltTextAction } from "@/lib/actions/media";
import { ROLE_LABEL } from "@/lib/media/roles";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { LibraryItem } from "@/lib/data/media";
import { buttonClass, inputClass } from "../styles";

type Props = { item: LibraryItem; url: string | null; stable: boolean };

export function MediaCard({ item, url, stable }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);
  const alt = useRef<HTMLInputElement>(null);
  const used = (item.usage_count ?? 0) + (item.cover_count ?? 0);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? { ok: true, text: res.message ?? "Fet" } : { ok: false, text: res.error ?? "Error" });
      if (res.ok) router.refresh();
    });

  return (
    <li className="grid content-start gap-3 border border-line p-3">
      {item.media_type === "image" ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-soft">
          {url ? (
            <Image src={url} alt={item.alt_text ?? ""} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 90vw" quality={60} unoptimized={!stable} className="object-cover" />
          ) : null}
        </div>
      ) : url ? (
        item.media_type === "audio" ? (
          <audio controls preload="none" src={url} className="w-full" aria-label={item.filename} />
        ) : (
          <video controls preload="none" src={url} className="aspect-video w-full bg-black" aria-label={item.filename} />
        )
      ) : null}

      <div className="grid gap-1 font-mono text-[11px]">
        <span className="truncate text-paper" title={item.original_filename ?? item.filename}>
          {item.filename}
        </span>
        <span className="text-smoke">
          {item.mime_type} · {formatBytes(Number(item.size ?? 0))}
          {item.media_type === "image" ? ` · ${item.width ?? "?"}×${item.height ?? "?"}` : ` · ${formatDuration(item.duration)}`}
        </span>
        <span className="text-smoke">{formatDate(item.created_at)}</span>
        <span className={used ? "text-paper" : "text-smoke/70"}>
          {used ? (
            <>
              Ús:{" "}
              {item.usedIn.map((u, i) => (
                <span key={`${u.vignetteId}-${u.role}`}>
                  {i ? ", " : ""}
                  <Link href={`/admin/vignettes/${u.vignetteId}`} className="underline underline-offset-2 hover:text-paper">
                    {u.title || u.slug}
                  </Link>{" "}
                  <span className="text-smoke">({ROLE_LABEL[u.role].toLowerCase()})</span>
                </span>
              ))}
              {item.cover_count ? `${item.usedIn.length ? ", " : ""}portada d'obra` : ""}
            </>
          ) : (
            "Sense ús"
          )}
        </span>
      </div>

      {item.media_type === "image" ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateAltTextAction(item.id, alt.current?.value ?? ""));
          }}
        >
          <input
            ref={alt}
            defaultValue={item.alt_text ?? ""}
            placeholder="Text alternatiu"
            aria-label={`Text alternatiu de ${item.filename}`}
            className={`${inputClass} py-1 text-sm`}
          />
          <button type="submit" disabled={pending} className={buttonClass("ghost")}>
            Desar
          </button>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {used ? (
          <span className="font-mono text-[10px] text-smoke">En ús: no es pot eliminar</span>
        ) : armed ? (
          <>
            <button type="button" disabled={pending} className={buttonClass("danger")} onClick={() => run(() => deleteMediaAction(item.id))}>
              Eliminar definitivament
            </button>
            <button type="button" className={buttonClass("ghost")} onClick={() => setArmed(false)}>
              Cancel·lar
            </button>
          </>
        ) : (
          <button type="button" className={buttonClass("danger")} onClick={() => setArmed(true)}>
            Eliminar
          </button>
        )}
        {msg ? (
          <span role={msg.ok ? "status" : "alert"} className={`font-mono text-[10px] ${msg.ok ? "text-smoke" : "text-ember"}`}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </li>
  );
}
