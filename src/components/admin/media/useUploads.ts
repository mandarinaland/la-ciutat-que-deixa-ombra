"use client";

import { useCallback, useRef, useState } from "react";
import {
  createUploadAction,
  finalizeUploadAction,
  type AttachTarget,
  type UploadTicket,
} from "@/lib/actions/media";
import { checkFile, type MediaKind, type UploadLimits } from "@/lib/media/limits";

export type UploadStatus = "preparing" | "uploading" | "finalizing" | "done" | "error" | "cancelled";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number; // 0..1
  status: UploadStatus;
  error?: string;
};

type Meta = { width: number | null; height: number | null; duration: number | null };

/** Dimensions o durada, llegides al navegador abans de pujar. */
async function readMeta(file: File, kind: MediaKind): Promise<Meta> {
  const empty: Meta = { width: null, height: null, duration: null };
  try {
    if (kind === "image") {
      if ("createImageBitmap" in window) {
        const bmp = await createImageBitmap(file);
        const meta = { width: bmp.width, height: bmp.height, duration: null };
        bmp.close();
        return meta;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return { width: img.naturalWidth, height: img.naturalHeight, duration: null };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const el = document.createElement(kind === "audio" ? "audio" : "video");
      el.preload = "metadata";
      el.src = url;
      await new Promise<void>((resolve, reject) => {
        el.onloadedmetadata = () => resolve();
        el.onerror = () => reject(new Error("metadata"));
        setTimeout(() => reject(new Error("timeout")), 10000);
      });
      const duration = Number.isFinite(el.duration) ? el.duration : null;
      if (el instanceof HTMLVideoElement) {
        return { width: el.videoWidth || null, height: el.videoHeight || null, duration };
      }
      return { width: null, height: null, duration };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return empty; // Les metadades són útils però no imprescindibles.
  }
}

/** Puja amb XHR per tenir progrés real i poder cancel·lar. */
function putFile(
  ticket: UploadTicket,
  file: File,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (key) xhr.setRequestHeader("apikey", key);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = `Error ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = body.message || body.error || message;
        } catch {
          /* resposta no JSON */
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Error de xarxa"));
    xhr.onabort = () => reject(new DOMException("cancel·lat", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    // Mateix format que supabase-js (multipart amb cacheControl).
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", new File([file], file.name, { type: ticket.mime }));
    xhr.send(body);
  });
}

export function useUploads({
  limits,
  expected,
  target,
  altText,
  onUploaded,
}: {
  limits: UploadLimits;
  expected?: MediaKind;
  target?: AttachTarget;
  altText?: () => string | undefined;
  onUploaded?: (mediaId: string) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  const patch = useCallback((id: string, p: Partial<UploadItem>) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }, []);

  const uploadOne = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      const item: UploadItem = { id, name: file.name, size: file.size, progress: 0, status: "preparing" };
      setItems((list) => [...list, item]);

      const check = checkFile(file, limits, expected);
      if (!check.ok) return patch(id, { status: "error", error: check.error });

      const controller = new AbortController();
      controllers.current.set(id, controller);
      try {
        const [meta, ticketRes] = await Promise.all([
          readMeta(file, check.kind),
          createUploadAction({ filename: file.name, type: file.type, size: file.size, expected }),
        ]);
        if (!ticketRes.ok || !ticketRes.data) return patch(id, { status: "error", error: ticketRes.ok ? "Error" : ticketRes.error });
        if (controller.signal.aborted) return patch(id, { status: "cancelled" });

        patch(id, { status: "uploading" });
        await putFile(ticketRes.data, file, (p) => patch(id, { progress: p }), controller.signal);

        patch(id, { status: "finalizing", progress: 1 });
        const t = ticketRes.data;
        const fin = await finalizeUploadAction({
          bucket: t.bucket as "images" | "audio" | "video",
          path: t.path,
          originalFilename: file.name,
          mime: t.mime,
          width: meta.width,
          height: meta.height,
          duration: meta.duration,
          altText: altText?.(),
          target,
        });
        if (!fin.ok || !fin.data) return patch(id, { status: "error", error: fin.ok ? "Error" : fin.error });
        patch(id, { status: "done" });
        onUploaded?.(fin.data.mediaId);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") patch(id, { status: "cancelled" });
        else patch(id, { status: "error", error: e instanceof Error ? e.message : "Error desconegut" });
      } finally {
        controllers.current.delete(id);
      }
    },
    [limits, expected, target, altText, onUploaded, patch],
  );

  const upload = useCallback(
    async (files: FileList | File[]) => {
      // En sèrie: més previsible amb fitxers grans i connexions lentes.
      for (const f of Array.from(files)) await uploadOne(f);
    },
    [uploadOne],
  );

  const cancel = useCallback((id: string) => controllers.current.get(id)?.abort(), []);
  const clearFinished = useCallback(
    () => setItems((list) => list.filter((i) => !["done", "cancelled", "error"].includes(i.status))),
    [],
  );

  const busy = items.some((i) => ["preparing", "uploading", "finalizing"].includes(i.status));
  return { items, upload, cancel, clearFinished, busy };
}
