import "server-only";
import type { Metadata } from "next";
import { excerpt, type Landing, type ReaderVignette } from "./auca";
import { formatVignetteNumber } from "@/lib/routing";

/** Metadades (SEO + Open Graph) a partir del contingut real de l'obra. */
export function landingMetadata(l: Landing, canonical: string): Metadata {
  const description = excerpt(l.work.intro_text ?? l.work.description ?? l.work.subtitle, 180) || undefined;
  const images = l.cover ? [{ url: l.cover.src, width: l.cover.width, height: l.cover.height, alt: l.cover.alt }] : undefined;
  return {
    title: { absolute: l.work.subtitle ? `${l.work.title} — ${l.work.subtitle}` : l.work.title },
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: l.work.title, description, images, url: canonical },
    twitter: { card: images ? "summary_large_image" : "summary", title: l.work.title, description, images: images?.map((i) => i.url) },
  };
}

export function vignetteMetadata(v: ReaderVignette, canonical: string): Metadata {
  const n = formatVignetteNumber(v.number, v.total);
  const title = v.title ? `${n} · ${v.title}` : `Vinyeta ${n}`;
  const description = excerpt(v.text, 180) || undefined;
  const images = v.image ? [{ url: v.image.src, width: v.image.width, height: v.image.height, alt: v.image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "article", title: `${title} — ${v.work.title}`, description, images, url: canonical },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
  };
}
